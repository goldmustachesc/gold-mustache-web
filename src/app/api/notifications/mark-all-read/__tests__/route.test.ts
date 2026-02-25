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

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

import { PATCH } from "../route";

function makeRequest(): Request {
  return new Request("http://localhost:3001/api/notifications/mark-all-read", {
    method: "PATCH",
  });
}

describe("PATCH /api/notifications/mark-all-read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await PATCH(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("marks all notifications as read", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockMarkAllAsRead.mockResolvedValue(undefined);

    const response = await PATCH(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith("user-1");
  });

  it("returns 500 when service throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockMarkAllAsRead.mockRejectedValue(new Error("boom"));

    const response = await PATCH(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
