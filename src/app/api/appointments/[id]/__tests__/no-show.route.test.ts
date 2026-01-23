import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockMarkAppointmentAsNoShow = vi.fn();
const mockBarberFindUnique = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("@/services/booking", () => ({
  markAppointmentAsNoShow: (...args: unknown[]) =>
    mockMarkAppointmentAsNoShow(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: {
      findUnique: (...args: unknown[]) => mockBarberFindUnique(...args),
    },
  },
}));

import { PATCH } from "../no-show/route";

function createRequest() {
  return new Request("http://localhost:3001/api/appointments/apt-1/no-show", {
    method: "PATCH",
  });
}

describe("PATCH /api/appointments/[id]/no-show", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 403 when user is not a barber", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockBarberFindUnique.mockResolvedValue(null);

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("FORBIDDEN");
  });

  it("returns appointment when marking succeeds", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockBarberFindUnique.mockResolvedValue({ id: "barber-1" });
    mockMarkAppointmentAsNoShow.mockResolvedValue({ id: "apt-1" });

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.appointment).toEqual({ id: "apt-1" });
    expect(mockMarkAppointmentAsNoShow).toHaveBeenCalledWith(
      "apt-1",
      "barber-1",
    );
  });

  it("maps known service errors to HTTP codes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockBarberFindUnique.mockResolvedValue({ id: "barber-1" });

    mockMarkAppointmentAsNoShow.mockRejectedValue(
      new Error("APPOINTMENT_NOT_FOUND"),
    );

    const notFound = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(notFound.status).toBe(404);

    mockMarkAppointmentAsNoShow.mockRejectedValue(
      new Error("APPOINTMENT_NOT_STARTED"),
    );

    const notStarted = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(notStarted.status).toBe(412);

    mockMarkAppointmentAsNoShow.mockRejectedValue(
      new Error("APPOINTMENT_NOT_MARKABLE"),
    );

    const notMarkable = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(notMarkable.status).toBe(409);

    mockMarkAppointmentAsNoShow.mockRejectedValue(new Error("UNAUTHORIZED"));

    const unauthorized = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(unauthorized.status).toBe(403);
  });

  it("returns 500 for unexpected errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockBarberFindUnique.mockResolvedValue({ id: "barber-1" });
    mockMarkAppointmentAsNoShow.mockRejectedValue(new Error("boom"));

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });

    expect(response.status).toBe(500);
  });
});
