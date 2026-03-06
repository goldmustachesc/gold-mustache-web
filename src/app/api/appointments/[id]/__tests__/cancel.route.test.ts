import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockCancelAppointmentByClient = vi.fn();
const mockCancelAppointmentByBarber = vi.fn();
const mockAppointmentFindUnique = vi.fn();
const mockBarberFindUnique = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockNotifyCancelledByBarber = vi.fn();
const mockNotifyBarberOfCancelledByClient = vi.fn();
const mockRequireValidOrigin = vi.fn();

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: (...args: unknown[]) => mockRequireValidOrigin(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/services/booking", () => ({
  cancelAppointmentByClient: (...args: unknown[]) =>
    mockCancelAppointmentByClient(...args),
  cancelAppointmentByBarber: (...args: unknown[]) =>
    mockCancelAppointmentByBarber(...args),
}));

vi.mock("@/services/notification", () => ({
  notifyAppointmentCancelledByBarber: (...args: unknown[]) =>
    mockNotifyCancelledByBarber(...args),
  notifyBarberOfAppointmentCancelledByClient: (...args: unknown[]) =>
    mockNotifyBarberOfCancelledByClient(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: (...args: unknown[]) => mockAppointmentFindUnique(...args),
    },
    barber: {
      findUnique: (...args: unknown[]) => mockBarberFindUnique(...args),
    },
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
    },
  },
}));

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
}));

import { PATCH } from "../cancel/route";

const APT_ID = "550e8400-e29b-41d4-a716-446655440000";

function createRequest(body = {}) {
  return new Request(
    `http://localhost:3001/api/appointments/${APT_ID}/cancel`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function createRequestWithRawBody(rawBody: string) {
  return new Request(
    `http://localhost:3001/api/appointments/${APT_ID}/cancel`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: rawBody,
    },
  );
}

const routeParams = { params: Promise.resolve({ id: APT_ID }) };

describe("PATCH /api/appointments/[id]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireValidOrigin.mockReturnValue(null);
  });

  it("returns 400 when request body is not valid JSON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await PATCH(
      createRequestWithRawBody("invalid-json{"),
      routeParams,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_JSON");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await PATCH(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 404 when appointment does not exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue(null);

    const response = await PATCH(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("validates barber cancellation requires reason", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barberId: "barber-1",
      clientId: "client-1",
    });
    mockBarberFindUnique.mockResolvedValue({ id: "barber-1" });

    const response = await PATCH(createRequest({}), routeParams);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("cancels as barber and notifies client", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barberId: "barber-1",
      clientId: "client-1",
    });
    mockBarberFindUnique.mockResolvedValue({ id: "barber-1" });
    mockCancelAppointmentByBarber.mockResolvedValue({
      clientId: "client-1",
      service: { name: "Corte" },
      barber: { name: "João" },
      date: "2026-03-10",
      startTime: "09:00",
    });
    mockProfileFindUnique.mockResolvedValue({ userId: "user-2" });

    const response = await PATCH(
      createRequest({ reason: "Indisponível" }),
      routeParams,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.clientId).toBe("client-1");
    expect(mockNotifyCancelledByBarber).toHaveBeenCalled();
  });

  it("cancels as client and notifies barber", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barberId: "barber-1",
      clientId: "client-1",
    });
    mockBarberFindUnique.mockResolvedValue(null);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });
    mockCancelAppointmentByClient.mockResolvedValue({ id: "apt-1" });

    const response = await PATCH(createRequest(), routeParams);

    expect(response.status).toBe(200);
    expect(mockNotifyBarberOfCancelledByClient).toHaveBeenCalled();
  });

  it("returns 404 when client profile not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barberId: "barber-1",
      clientId: "client-1",
    });
    mockBarberFindUnique.mockResolvedValue(null);
    mockProfileFindUnique.mockResolvedValue(null);

    const response = await PATCH(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("PROFILE_NOT_FOUND");
  });

  it("returns origin error when requireValidOrigin rejects", async () => {
    mockRequireValidOrigin.mockReturnValue(
      Response.json(
        { error: "FORBIDDEN", message: "Origem não permitida" },
        { status: 403 },
      ),
    );

    const response = await PATCH(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("FORBIDDEN");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("maps APPOINTMENT_IN_PAST domain error to 400", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barberId: "barber-1",
      clientId: "client-1",
    });
    mockBarberFindUnique.mockResolvedValue(null);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });

    mockCancelAppointmentByClient.mockRejectedValue(
      new Error("APPOINTMENT_IN_PAST"),
    );

    const response = await PATCH(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("APPOINTMENT_IN_PAST");
  });

  it("maps APPOINTMENT_NOT_CANCELLABLE domain error to 400", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barberId: "barber-1",
      clientId: "client-1",
    });
    mockBarberFindUnique.mockResolvedValue(null);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });

    mockCancelAppointmentByClient.mockRejectedValue(
      new Error("APPOINTMENT_NOT_CANCELLABLE"),
    );

    const response = await PATCH(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("APPOINTMENT_NOT_CANCELLABLE");
  });

  it("maps APPOINTMENT_NOT_FOUND domain error to 404", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barberId: "barber-1",
      clientId: "client-1",
    });
    mockBarberFindUnique.mockResolvedValue(null);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });

    mockCancelAppointmentByClient.mockRejectedValue(
      new Error("APPOINTMENT_NOT_FOUND"),
    );

    const response = await PATCH(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });
});
