import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCancelAppointmentByGuestToken = vi.fn();
const mockNotifyBarberOfCancelledByClient = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();

vi.mock("@/services/booking", () => ({
  cancelAppointmentByGuestToken: (...args: unknown[]) =>
    mockCancelAppointmentByGuestToken(...args),
}));

vi.mock("@/services/notification", () => ({
  notifyBarberOfAppointmentCancelledByClient: (...args: unknown[]) =>
    mockNotifyBarberOfCancelledByClient(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

import { PATCH } from "../cancel/route";

function createRequest(guestToken?: string) {
  const headers: Record<string, string> = {};
  if (guestToken) headers["X-Guest-Token"] = guestToken;
  return new Request(
    "http://localhost:3001/api/appointments/guest/apt-1/cancel",
    { method: "PATCH", headers },
  );
}

const routeParams = { params: Promise.resolve({ id: "apt-1" }) };

describe("PATCH /api/appointments/guest/[id]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIdentifier.mockReturnValue("client-ip");
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9 });
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 1000,
    });

    const response = await PATCH(createRequest("token-1"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("returns 401 when guest token is missing", async () => {
    const response = await PATCH(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("MISSING_TOKEN");
  });

  it("cancels appointment and notifies barber on success", async () => {
    mockCancelAppointmentByGuestToken.mockResolvedValue({ id: "apt-1" });

    const response = await PATCH(createRequest("token-1"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("apt-1");
    expect(mockCancelAppointmentByGuestToken).toHaveBeenCalledWith(
      "apt-1",
      "token-1",
    );
    expect(mockNotifyBarberOfCancelledByClient).toHaveBeenCalled();
  });

  it("maps GUEST_NOT_FOUND domain error to 404", async () => {
    mockCancelAppointmentByGuestToken.mockRejectedValue(
      new Error("GUEST_NOT_FOUND"),
    );

    const response = await PATCH(createRequest("token-1"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("GUEST_NOT_FOUND");
  });

  it("maps GUEST_TOKEN_CONSUMED domain error to 401", async () => {
    mockCancelAppointmentByGuestToken.mockRejectedValue(
      new Error("GUEST_TOKEN_CONSUMED"),
    );

    const response = await PATCH(createRequest("token-1"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("GUEST_TOKEN_CONSUMED");
  });

  it("maps APPOINTMENT_IN_PAST domain error to 400", async () => {
    mockCancelAppointmentByGuestToken.mockRejectedValue(
      new Error("APPOINTMENT_IN_PAST"),
    );

    const response = await PATCH(createRequest("token-1"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("APPOINTMENT_IN_PAST");
  });

  it("maps APPOINTMENT_NOT_CANCELLABLE domain error to 400", async () => {
    mockCancelAppointmentByGuestToken.mockRejectedValue(
      new Error("APPOINTMENT_NOT_CANCELLABLE"),
    );

    const response = await PATCH(createRequest("token-1"), routeParams);

    expect(response.status).toBe(400);
  });

  it("maps CANCELLATION_BLOCKED domain error to 400", async () => {
    mockCancelAppointmentByGuestToken.mockRejectedValue(
      new Error("CANCELLATION_BLOCKED"),
    );

    const response = await PATCH(createRequest("token-1"), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("CANCELLATION_BLOCKED");
  });
});
