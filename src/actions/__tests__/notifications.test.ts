import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../notifications";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();

vi.mock("@/services/notification", () => ({
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u-1" } },
  });
  mockMarkAsRead.mockResolvedValue(undefined);
  mockMarkAllAsRead.mockResolvedValue(undefined);
});

describe("markNotificationAsRead", () => {
  it("calls markAsRead service with notificationId and userId", async () => {
    const result = await markNotificationAsRead(
      "550e8400-e29b-41d4-a716-446655440000",
    );

    expect(result.success).toBe(true);
    expect(mockMarkAsRead).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      "u-1",
    );
  });

  it("returns validation error for invalid UUID", async () => {
    const result = await markNotificationAsRead("not-a-uuid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
    expect(mockMarkAsRead).not.toHaveBeenCalled();
  });

  it("returns unauthorized when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await markNotificationAsRead(
      "550e8400-e29b-41d4-a716-446655440000",
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
  });
});

describe("markAllNotificationsAsRead", () => {
  it("calls markAllAsRead service with userId", async () => {
    const result = await markAllNotificationsAsRead();

    expect(result.success).toBe(true);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith("u-1");
  });

  it("returns unauthorized when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await markAllNotificationsAsRead();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
  });
});
