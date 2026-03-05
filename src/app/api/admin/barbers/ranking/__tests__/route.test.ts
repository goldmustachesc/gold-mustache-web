import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockGetBarberRanking = vi.fn();
vi.mock("@/services/feedback", () => ({
  getBarberRanking: (...args: unknown[]) => mockGetBarberRanking(...args),
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

describe("GET /api/admin/barbers/ranking", () => {
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

  it("returns barber ranking", async () => {
    adminAuthenticated();
    const ranking = [
      { barberId: "b1", name: "Carlos", averageRating: 4.8 },
      { barberId: "b2", name: "André", averageRating: 4.5 },
    ];
    mockGetBarberRanking.mockResolvedValue(ranking);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].averageRating).toBe(4.8);
  });

  it("returns 500 on service failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetBarberRanking.mockRejectedValue(new Error("fail"));

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
