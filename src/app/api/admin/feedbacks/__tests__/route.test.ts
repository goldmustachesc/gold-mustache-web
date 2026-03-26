import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockGetAllFeedbacks = vi.fn();
vi.mock("@/services/feedback", () => ({
  getAllFeedbacks: (...args: unknown[]) => mockGetAllFeedbacks(...args),
}));

import { GET } from "../route";

function adminAuthenticated() {
  mockRequireAdmin.mockResolvedValue({
    ok: true,
    userId: "admin-user-id",
    profileId: "admin-profile-id",
    role: "ADMIN",
  });
}

function adminUnauthorized() {
  mockRequireAdmin.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireAdminResult);
}

function createRequest(params = ""): NextRequest {
  return new NextRequest(
    `http://localhost:3001/api/admin/feedbacks${params ? `?${params}` : ""}`,
  );
}

describe("GET /api/admin/feedbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET(createRequest());

    expect(response.status).toBe(401);
  });

  it("returns feedbacks with default pagination", async () => {
    adminAuthenticated();
    mockGetAllFeedbacks.mockResolvedValue({
      feedbacks: [],
      total: 0,
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    expect(mockGetAllFeedbacks).toHaveBeenCalledWith(expect.any(Object), 1, 20);
  });

  it("passes filters to service", async () => {
    adminAuthenticated();
    mockGetAllFeedbacks.mockResolvedValue({
      feedbacks: [],
      total: 0,
    });

    await GET(createRequest("barberId=b1&rating=5&hasComment=true"));

    const filters = mockGetAllFeedbacks.mock.calls[0][0];
    expect(filters.barberId).toBe("b1");
    expect(filters.rating).toBe(5);
    expect(filters.hasComment).toBe(true);
  });

  it("returns 500 on service failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetAllFeedbacks.mockRejectedValue(new Error("fail"));

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
