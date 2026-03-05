import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
}));

const mockGetBarberFeedbackStats = vi.fn();
vi.mock("@/services/feedback", () => ({
  getBarberFeedbackStats: (...args: unknown[]) =>
    mockGetBarberFeedbackStats(...args),
}));

import { GET } from "../route";

function barberAuthenticated() {
  mockRequireBarber.mockResolvedValue({
    ok: true,
    userId: "user-1",
    barberId: "barber-1",
    barberName: "Carlos",
  });
}

function barberUnauthorized() {
  mockRequireBarber.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireBarberResult);
}

describe("GET /api/barbers/me/feedbacks/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns feedback stats for authenticated barber", async () => {
    barberAuthenticated();
    const stats = { averageRating: 4.7, totalFeedbacks: 15 };
    mockGetBarberFeedbackStats.mockResolvedValue(stats);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.averageRating).toBe(4.7);
    expect(mockGetBarberFeedbackStats).toHaveBeenCalledWith("barber-1");
  });

  it("returns 500 on service failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetBarberFeedbackStats.mockRejectedValue(new Error("fail"));

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
