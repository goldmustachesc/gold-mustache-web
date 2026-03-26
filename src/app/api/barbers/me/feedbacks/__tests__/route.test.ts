import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
}));

const mockGetBarberFeedbacks = vi.fn();
vi.mock("@/services/feedback", () => ({
  getBarberFeedbacks: (...args: unknown[]) => mockGetBarberFeedbacks(...args),
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

function createRequest(params = ""): NextRequest {
  return new NextRequest(
    `http://localhost:3001/api/barbers/me/feedbacks${params ? `?${params}` : ""}`,
  );
}

describe("GET /api/barbers/me/feedbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await GET(createRequest());

    expect(response.status).toBe(401);
  });

  it("returns feedbacks for authenticated barber", async () => {
    barberAuthenticated();
    mockGetBarberFeedbacks.mockResolvedValue({
      feedbacks: [{ id: "fb-1", rating: 5 }],
      total: 1,
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    expect(mockGetBarberFeedbacks).toHaveBeenCalledWith("barber-1", 1, 20);
  });

  it("passes pagination params", async () => {
    barberAuthenticated();
    mockGetBarberFeedbacks.mockResolvedValue({
      feedbacks: [],
      total: 0,
    });

    await GET(createRequest("page=2&limit=5"));

    expect(mockGetBarberFeedbacks).toHaveBeenCalledWith("barber-1", 2, 5);
  });

  it("returns 500 on service failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetBarberFeedbacks.mockRejectedValue(new Error("fail"));

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
