import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotifications } from "../useNotifications";

type ChannelCallback = (payload: { new: Record<string, unknown> }) => void;

let channelCallback: ChannelCallback | null = null;

const mockRemoveChannel = vi.fn();
const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
const mockOn = vi.fn().mockImplementation((_event, _filter, cb) => {
  channelCallback = cb;
  return { subscribe: mockSubscribe };
});
const mockChannel = vi.fn().mockReturnValue({ on: mockOn });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

const mockApiGet = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiGet: mockApiGet,
}));

const mockMarkAsRead = vi.hoisted(() => vi.fn());
const mockMarkAllAsRead = vi.hoisted(() => vi.fn());

vi.mock("@/actions/notifications", () => ({
  markNotificationAsRead: mockMarkAsRead,
  markAllNotificationsAsRead: mockMarkAllAsRead,
}));

const MOCK_NOTIFICATIONS = [
  {
    id: "n-1",
    userId: "u-1",
    type: "APPOINTMENT",
    title: "Title",
    message: "Msg",
    read: false,
    createdAt: "2026-03-01",
  },
  {
    id: "n-2",
    userId: "u-1",
    type: "APPOINTMENT",
    title: "Title 2",
    message: "Msg 2",
    read: true,
    createdAt: "2026-03-02",
  },
];

const MOCK_API_RESPONSE = {
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: 1,
  meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
};

beforeEach(() => {
  channelCallback = null;
  vi.clearAllMocks();
  mockApiGet.mockResolvedValue(MOCK_API_RESPONSE);
  mockMarkAsRead.mockResolvedValue({ success: true });
  mockMarkAllAsRead.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useNotifications", () => {
  it("returns empty state when userId is null", async () => {
    const { result } = renderHook(() => useNotifications({ userId: null }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.meta).toBeNull();
  });

  it("fetches notifications from API on mount", async () => {
    const { result } = renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockApiGet).toHaveBeenCalledWith(
      expect.stringContaining("/api/notifications?"),
    );
  });

  it("sets notifications and unreadCount from response", async () => {
    const { result } = renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.meta?.total).toBe(2);
  });

  it("subscribes to Supabase realtime channel", async () => {
    renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith("notifications:u-1");
    });
    expect(mockOn).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "INSERT",
        schema: "public",
        table: "notifications",
      }),
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("adds new notification to list on realtime INSERT", async () => {
    const { result } = renderHook(() =>
      useNotifications({ userId: "u-1", page: 1 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      channelCallback?.({
        new: {
          id: "n-3",
          user_id: "u-1",
          type: "FEEDBACK",
          title: "New",
          message: "New msg",
          data: null,
          read: false,
          created_at: "2026-03-03",
        },
      });
    });

    expect(result.current.notifications).toHaveLength(3);
    expect(result.current.notifications[0].id).toBe("n-3");
  });

  it("increments unreadCount on unread realtime notification", async () => {
    const { result } = renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unreadCount).toBe(1);

    act(() => {
      channelCallback?.({
        new: {
          id: "n-4",
          user_id: "u-1",
          type: "FEEDBACK",
          title: "New",
          message: "Msg",
          data: null,
          read: false,
          created_at: "2026-03-04",
        },
      });
    });

    expect(result.current.unreadCount).toBe(2);
  });

  it("calls onNewNotification callback on realtime INSERT", async () => {
    const onNew = vi.fn();

    renderHook(() =>
      useNotifications({ userId: "u-1", onNewNotification: onNew }),
    );

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    act(() => {
      channelCallback?.({
        new: {
          id: "n-5",
          user_id: "u-1",
          type: "INFO",
          title: "Title",
          message: "Msg",
          data: null,
          read: false,
          created_at: "2026-03-05",
        },
      });
    });

    expect(onNew).toHaveBeenCalledWith(
      expect.objectContaining({ id: "n-5", type: "INFO" }),
    );
  });

  it("markAsRead calls server action and updates state", async () => {
    const { result } = renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markAsRead("n-1");
    });

    expect(mockMarkAsRead).toHaveBeenCalledWith("n-1");
    const updated = result.current.notifications.find((n) => n.id === "n-1");
    expect(updated?.read).toBe(true);
  });

  it("markAsRead decrements unreadCount", async () => {
    const { result } = renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unreadCount).toBe(1);

    await act(async () => {
      await result.current.markAsRead("n-1");
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it("markAllAsRead calls server action and marks all read", async () => {
    const { result } = renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockMarkAllAsRead).toHaveBeenCalled();
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it("handles API error gracefully", async () => {
    mockApiGet.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("unsubscribes from channel on unmount", async () => {
    const { unmount } = renderHook(() => useNotifications({ userId: "u-1" }));

    await waitFor(() => expect(mockChannel).toHaveBeenCalled());

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
