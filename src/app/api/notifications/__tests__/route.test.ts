import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockGetNotifications = vi.fn();
const mockGetUnreadCount = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetUserRateLimitIdentifier = vi.fn();

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

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getUserRateLimitIdentifier: (...args: unknown[]) =>
    mockGetUserRateLimitIdentifier(...args),
}));

import { GET } from "../route";

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetUserRateLimitIdentifier.mockImplementation((userId: unknown) => {
      return `auth:${String(userId)}`;
    });
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const response = await GET(
      new Request("http://localhost:3001/api/notifications"),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
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
    mockGetNotifications.mockResolvedValue({
      notifications: [{ id: "n-1" }],
      total: 1,
    });
    mockGetUnreadCount.mockResolvedValue(2);

    const response = await GET(
      new Request("http://localhost:3001/api/notifications"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.notifications).toEqual([{ id: "n-1" }]);
    expect(body.data.unreadCount).toBe(2);
    expect(body.data.meta).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(mockCheckRateLimit).toHaveBeenCalledWith("api", "auth:user-1");
  });

  it("returns 500 on service error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
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
