import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockGetOverallFeedbackStats = vi.fn();
vi.mock("@/services/feedback", () => ({
  getOverallFeedbackStats: (...args: unknown[]) =>
    mockGetOverallFeedbackStats(...args),
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

describe("GET /api/admin/feedbacks/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns overall feedback stats", async () => {
    adminAuthenticated();
    const stats = { totalFeedbacks: 50, averageRating: 4.5 };
    mockGetOverallFeedbackStats.mockResolvedValue(stats);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.totalFeedbacks).toBe(50);
    expect(json.data.averageRating).toBe(4.5);
  });

  it("returns 500 on service failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetOverallFeedbackStats.mockRejectedValue(new Error("fail"));

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
