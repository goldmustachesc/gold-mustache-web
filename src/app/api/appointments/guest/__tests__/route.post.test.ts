import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBarbershopSettings = vi.fn();
const mockResolveBookingMode = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();

vi.mock("@/services/barbershop-settings", () => ({
  getBarbershopSettings: (...args: unknown[]) =>
    mockGetBarbershopSettings(...args),
}));

vi.mock("@/lib/booking-mode", () => ({
  resolveBookingMode: (...args: unknown[]) => mockResolveBookingMode(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

vi.mock("@/services/booking", () => ({
  createGuestAppointment: vi.fn(),
}));

import { POST } from "../route";

function createPostRequest() {
  return new Request("http://localhost:3001/api/appointments/guest", {
    method: "POST",
  });
}

describe("POST /api/appointments/guest - booking mode guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBarbershopSettings.mockResolvedValue({
      bookingEnabled: true,
      externalBookingUrl: null,
    });
    mockGetClientIdentifier.mockReturnValue("guest-client-id");
  });

  it("returns 403 BOOKING_DISABLED when mode is external", async () => {
    mockResolveBookingMode.mockReturnValue("external");

    const response = await POST(createPostRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("BOOKING_DISABLED");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("returns 403 BOOKING_DISABLED when mode is disabled", async () => {
    mockResolveBookingMode.mockReturnValue("disabled");

    const response = await POST(createPostRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("BOOKING_DISABLED");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("continues flow in internal mode and reaches rate limit guard", async () => {
    mockResolveBookingMode.mockReturnValue("internal");
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 456,
    });

    const response = await POST(createPostRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "guestAppointments",
      "guest-client-id",
    );
  });
});
