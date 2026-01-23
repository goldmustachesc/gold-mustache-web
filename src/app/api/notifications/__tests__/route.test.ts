import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockGetNotifications = vi.fn();
const mockGetUnreadCount = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("@/services/notification", () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
}));

import { GET } from "../route";

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(
      new Request("http://localhost:3001/api/notifications"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns notifications and unread count", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetNotifications.mockResolvedValue([{ id: "n-1" }]);
    mockGetUnreadCount.mockResolvedValue(2);

    const response = await GET(
      new Request("http://localhost:3001/api/notifications"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications).toEqual([{ id: "n-1" }]);
    expect(body.unreadCount).toBe(2);
  });

  it("returns 500 on service error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetNotifications.mockRejectedValue(new Error("boom"));

    const response = await GET(
      new Request("http://localhost:3001/api/notifications"),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
