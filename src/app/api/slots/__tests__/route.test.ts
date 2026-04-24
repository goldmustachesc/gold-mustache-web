import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetBookingAvailability = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();

vi.mock("@/services/booking", () => ({
  getBookingAvailability: (...args: unknown[]) =>
    mockGetBookingAvailability(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

import { GET } from "../route";

describe("GET /api/slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetClientIdentifier.mockReturnValue("127.0.0.1");
  });

  it("returns 422 when query params are invalid", async () => {
    const request = new Request("http://localhost:3001/api/slots");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns slots when query params are valid", async () => {
    const availability = {
      barberId: "b450f113-be42-4648-af5f-70893d137c19",
      serviceDuration: 30,
      windows: [{ startTime: "10:00", endTime: "12:00" }],
    };
    mockGetBookingAvailability.mockResolvedValue(availability);

    const barberId = "b450f113-be42-4648-af5f-70893d137c19";
    const serviceId = "83ec4540-5bf9-4661-a133-97a6275eb303";

    const request = new Request(
      `http://localhost:3001/api/slots?date=2025-01-02&barberId=${barberId}&serviceId=${serviceId}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetBookingAvailability).toHaveBeenCalledWith(
      expect.any(Date),
      barberId,
      serviceId,
      { applyLeadTime: true },
    );
    expect(body.data).toEqual(availability);
  });

  it("returns 500 when service throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetBookingAvailability.mockRejectedValue(new Error("boom"));

    const barberId = "b450f113-be42-4648-af5f-70893d137c19";
    const serviceId = "83ec4540-5bf9-4661-a133-97a6275eb303";

    const request = new Request(
      `http://localhost:3001/api/slots?date=2025-01-02&barberId=${barberId}&serviceId=${serviceId}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const barberId = "b450f113-be42-4648-af5f-70893d137c19";
    const serviceId = "83ec4540-5bf9-4661-a133-97a6275eb303";

    const request = new Request(
      `http://localhost:3001/api/slots?date=2025-01-02&barberId=${barberId}&serviceId=${serviceId}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("returns 422 when only date is provided (missing barberId and serviceId)", async () => {
    const request = new Request(
      "http://localhost:3001/api/slots?date=2025-01-02",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when barberId is missing", async () => {
    const serviceId = "83ec4540-5bf9-4661-a133-97a6275eb303";

    const request = new Request(
      `http://localhost:3001/api/slots?date=2025-01-02&serviceId=${serviceId}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when serviceId is missing", async () => {
    const barberId = "b450f113-be42-4648-af5f-70893d137c19";

    const request = new Request(
      `http://localhost:3001/api/slots?date=2025-01-02&barberId=${barberId}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
