import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireBarber = vi.fn();
const mockCreateAppointmentByBarber = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetUserRateLimitIdentifier = vi.fn();
const mockNotifyGuestAppointmentConfirmed = vi.fn();

vi.mock("@/services/notification", () => ({
  notifyGuestAppointmentConfirmed: (...args: unknown[]) =>
    mockNotifyGuestAppointmentConfirmed(...args),
}));

vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: (...args: unknown[]) => mockRequireBarber(...args),
}));

vi.mock("@/services/booking", () => ({
  createAppointmentByBarber: (...args: unknown[]) =>
    mockCreateAppointmentByBarber(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getUserRateLimitIdentifier: (...args: unknown[]) =>
    mockGetUserRateLimitIdentifier(...args),
}));

import { POST } from "../route";

function createRequest(body: unknown) {
  return new Request("http://localhost:3001/api/barbers/me/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  serviceId: "550e8400-e29b-41d4-a716-446655440000",
  date: "2026-03-10",
  startTime: "09:00",
  clientName: "João Silva",
  clientPhone: "11999999999",
};

describe("POST /api/barbers/me/appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetUserRateLimitIdentifier.mockImplementation((userId: unknown) => {
      return `auth:${String(userId)}`;
    });
    mockNotifyGuestAppointmentConfirmed.mockResolvedValue(undefined);
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

    const response = await POST(createRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("returns auth error when requireBarber fails", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    });

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(401);
  });

  it("returns 422 for invalid body", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });

    const response = await POST(createRequest({ serviceId: "bad" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("creates appointment on success", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });
    mockCreateAppointmentByBarber.mockResolvedValue({
      id: "apt-1",
      status: "CONFIRMED",
    });

    const response = await POST(createRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("apt-1");
    expect(mockCreateAppointmentByBarber).toHaveBeenCalledWith(
      validBody,
      "barber-1",
    );
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "appointments",
      "auth:user-1",
    );
  });

  it("maps SLOT_OCCUPIED domain error to 409", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });
    mockCreateAppointmentByBarber.mockRejectedValue(new Error("SLOT_OCCUPIED"));

    const response = await POST(createRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("SLOT_OCCUPIED");
  });

  it("maps SLOT_IN_PAST domain error to 400", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });
    mockCreateAppointmentByBarber.mockRejectedValue(new Error("SLOT_IN_PAST"));

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(400);
  });

  it("creates appointment even when guest notification fails", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      userId: "user-1",
      barberId: "barber-1",
      barberName: "Carlos",
    });
    mockCreateAppointmentByBarber.mockResolvedValue({
      id: "apt-guest-1",
      status: "CONFIRMED",
      service: { name: "Corte" },
      barber: { name: "Carlos" },
      date: "2026-03-10",
      startTime: "09:00",
      guestClient: {
        phone: "47988888888",
        fullName: "Convidado",
      },
    });
    mockNotifyGuestAppointmentConfirmed.mockRejectedValueOnce(
      new Error("network_error"),
    );

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(201);
    expect(mockNotifyGuestAppointmentConfirmed).toHaveBeenCalled();
  });
});
