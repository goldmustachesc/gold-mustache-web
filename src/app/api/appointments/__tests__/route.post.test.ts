import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBarbershopSettings = vi.fn();
const mockResolveBookingMode = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();
const mockCreateClient = vi.fn();

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

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// Mocks required by module imports; not exercised in these guard tests.
vi.mock("@/services/booking", () => ({
  createAppointment: vi.fn(),
  getClientAppointments: vi.fn(),
  getBarberAppointments: vi.fn(),
}));
vi.mock("@/services/notification", () => ({
  notifyAppointmentConfirmed: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: { findUnique: vi.fn() },
    profile: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { POST } from "../route";

function createPostRequest() {
  return new Request("http://localhost:3001/api/appointments", {
    method: "POST",
  });
}

describe("POST /api/appointments - booking mode guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBarbershopSettings.mockResolvedValue({
      bookingEnabled: true,
      externalBookingUrl: null,
    });
    mockGetClientIdentifier.mockReturnValue("client-id");
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn() },
    });
  });

  it("returns 403 BOOKING_DISABLED when mode is external", async () => {
    mockResolveBookingMode.mockReturnValue("external");

    const response = await POST(createPostRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("BOOKING_DISABLED");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("returns 403 BOOKING_DISABLED when mode is disabled", async () => {
    mockResolveBookingMode.mockReturnValue("disabled");

    const response = await POST(createPostRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("BOOKING_DISABLED");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("continues flow in internal mode and reaches rate limit guard", async () => {
    mockResolveBookingMode.mockReturnValue("internal");
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 123,
    });

    const response = await POST(createPostRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "appointments",
      "client-id",
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
