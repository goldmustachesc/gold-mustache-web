import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetGuestAppointments = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();

vi.mock("@/services/booking", () => ({
  getGuestAppointmentsByToken: (...args: unknown[]) =>
    mockGetGuestAppointments(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

import { GET } from "../route";

describe("GET /api/appointments/guest/lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: 0,
    });
    mockGetClientIdentifier.mockReturnValue("ip:test");
  });

  it("returns 401 when token is missing", async () => {
    const response = await GET(
      new Request("http://localhost:3001/api/appointments/guest/lookup"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("MISSING_TOKEN");
  });

  it("returns appointments when token is provided", async () => {
    mockGetGuestAppointments.mockResolvedValue([{ id: "apt-1" }]);

    const request = new Request(
      "http://localhost:3001/api/appointments/guest/lookup",
      {
        headers: { "X-Guest-Token": "token-123" },
      },
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([{ id: "apt-1" }]);
    expect(mockGetGuestAppointments).toHaveBeenCalledWith("token-123");
  });

  it("returns 401 when guest token was already consumed", async () => {
    mockGetGuestAppointments.mockRejectedValue(
      new Error("GUEST_TOKEN_CONSUMED"),
    );

    const request = new Request(
      "http://localhost:3001/api/appointments/guest/lookup",
      {
        headers: { "X-Guest-Token": "token-123" },
      },
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("GUEST_TOKEN_CONSUMED");
  });

  it("returns 500 when service throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetGuestAppointments.mockRejectedValue(new Error("boom"));

    const request = new Request(
      "http://localhost:3001/api/appointments/guest/lookup",
      {
        headers: { "X-Guest-Token": "token-123" },
      },
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
