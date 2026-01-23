import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockMarkAllAsRead = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("@/services/notification", () => ({
  markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
}));

import { PATCH } from "../route";

describe("PATCH /api/notifications/mark-all-read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await PATCH();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("marks all notifications as read", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockMarkAllAsRead.mockResolvedValue(undefined);

    const response = await PATCH();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith("user-1");
  });

  it("returns 500 when service throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockMarkAllAsRead.mockRejectedValue(new Error("boom"));

    const response = await PATCH();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
