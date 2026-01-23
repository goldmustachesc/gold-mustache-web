import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockMarkAsRead = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("@/services/notification", () => ({
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
}));

import { PATCH } from "../route";

describe("PATCH /api/notifications/[id]/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("marks notification as read", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockMarkAsRead.mockResolvedValue(undefined);

    const response = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1", "user-1");
  });

  it("returns 500 when service throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockMarkAsRead.mockRejectedValue(new Error("boom"));

    const response = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ id: "notif-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
