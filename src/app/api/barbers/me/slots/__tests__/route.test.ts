import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireBarber = vi.fn();
const mockGetAvailableSlots = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetUserRateLimitIdentifier = vi.fn();

vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: (...args: unknown[]) => mockRequireBarber(...args),
}));

vi.mock("@/services/booking", () => ({
  getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getUserRateLimitIdentifier: (...args: unknown[]) =>
    mockGetUserRateLimitIdentifier(...args),
}));

import { GET } from "../route";

const barberId = "b450f113-be42-4648-af5f-70893d137c19";
const serviceId = "83ec4540-5bf9-4661-a133-97a6275eb303";

function createRequest(query = "") {
  return new Request(
    `http://localhost:3001/api/barbers/me/slots${query ? `?${query}` : ""}`,
  );
}

function validQuery() {
  return `date=2025-01-02&barberId=${barberId}&serviceId=${serviceId}`;
}

describe("GET /api/barbers/me/slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetUserRateLimitIdentifier.mockImplementation(
      (userId: unknown) => `auth:${String(userId)}`,
    );
  });

  it("returns 401 when requireBarber fails", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    });

    const response = await GET(createRequest(validQuery()));

    expect(response.status).toBe(401);
    expect(mockGetAvailableSlots).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const response = await GET(createRequest(validQuery()));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
    expect(mockGetAvailableSlots).not.toHaveBeenCalled();
  });

  it("returns 422 when query params are missing", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns slots without applyLeadTime on success", async () => {
    const slots = [
      { time: "09:00", available: true },
      { time: "09:30", available: true },
    ];
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });
    mockGetAvailableSlots.mockResolvedValue(slots);

    const response = await GET(createRequest(validQuery()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(slots);
    expect(mockGetAvailableSlots).toHaveBeenCalledWith(
      expect.any(Date),
      barberId,
      serviceId,
    );
  });

  it("returns 500 when service throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });
    mockGetAvailableSlots.mockRejectedValue(new Error("boom"));

    const response = await GET(createRequest(validQuery()));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
