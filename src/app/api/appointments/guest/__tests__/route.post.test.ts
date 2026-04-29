import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBarbershopSettings = vi.fn();
const mockResolveBookingMode = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();
const mockCreateGuestAppointment = vi.fn();
const mockNotifyGuestAppointmentConfirmed = vi.fn();
const mockBarberFindUnique = vi.fn();

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
  createGuestAppointment: (...args: unknown[]) =>
    mockCreateGuestAppointment(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: {
      findUnique: (...args: unknown[]) => mockBarberFindUnique(...args),
    },
  },
}));

vi.mock("@/services/notification", () => ({
  notifyGuestAppointmentConfirmed: (...args: unknown[]) =>
    mockNotifyGuestAppointmentConfirmed(...args),
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
    mockBarberFindUnique.mockResolvedValue({ userId: "user-1" });
    mockCreateGuestAppointment.mockResolvedValue({
      appointment: {
        id: "apt-1",
        barberId: "barber-1",
        date: "2026-04-17",
        startTime: "10:00",
        service: { name: "Corte" },
        barber: { name: "João" },
        guestClient: {
          phone: "47988888888",
          fullName: "Convidado",
        },
      },
      accessToken: "token-1",
    });
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

  it("creates guest appointment even when notification dispatch fails", async () => {
    mockResolveBookingMode.mockReturnValue("internal");
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockNotifyGuestAppointmentConfirmed.mockRejectedValueOnce(
      new Error("network_error"),
    );

    const request = new Request(
      "http://localhost:3001/api/appointments/guest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: "550e8400-e29b-41d4-a716-446655440000",
          barberId: "650e8400-e29b-41d4-a716-446655440000",
          date: "2026-04-17",
          startTime: "10:00",
          clientName: "Convidado",
          clientPhone: "47988888888",
        }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockNotifyGuestAppointmentConfirmed).toHaveBeenCalled();
  });
});
