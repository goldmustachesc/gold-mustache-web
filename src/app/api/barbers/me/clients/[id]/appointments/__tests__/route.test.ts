import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireBarber = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockGuestClientFindUnique = vi.fn();
const mockAppointmentFindMany = vi.fn();

vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: (...args: unknown[]) => mockRequireBarber(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
    },
    guestClient: {
      findUnique: (...args: unknown[]) => mockGuestClientFindUnique(...args),
    },
    appointment: {
      findMany: (...args: unknown[]) => mockAppointmentFindMany(...args),
    },
  },
}));

import { GET } from "../route";

function createRequest() {
  return new Request(
    "http://localhost:3001/api/barbers/me/clients/client-1/appointments",
    { method: "GET" },
  );
}

const routeParams = { params: Promise.resolve({ id: "client-1" }) };

describe("GET /api/barbers/me/clients/[id]/appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error when requireBarber fails", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "FORBIDDEN" }, { status: 403 }),
    });

    const response = await GET(createRequest(), routeParams);

    expect(response.status).toBe(403);
  });

  it("returns 404 when neither profile nor guest client found", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      barberId: "barber-1",
    });
    mockProfileFindUnique.mockResolvedValue(null);
    mockGuestClientFindUnique.mockResolvedValue(null);

    const response = await GET(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns appointments for a registered profile", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      barberId: "barber-1",
    });
    mockProfileFindUnique.mockResolvedValue({ id: "client-1" });
    mockGuestClientFindUnique.mockResolvedValue(null);
    mockAppointmentFindMany.mockResolvedValue([
      {
        id: "apt-1",
        date: new Date("2026-03-10T00:00:00Z"),
        startTime: "09:00",
        status: "CONFIRMED",
        service: { name: "Corte", price: 50 },
        barber: { name: "Carlos" },
      },
    ]);

    const response = await GET(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].date).toBe("2026-03-10");
    expect(body.data[0].servicePrice).toBe(50);
  });

  it("returns appointments for a guest client", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      barberId: "barber-1",
    });
    mockProfileFindUnique.mockResolvedValue(null);
    mockGuestClientFindUnique.mockResolvedValue({ id: "guest-1" });
    mockAppointmentFindMany.mockResolvedValue([
      {
        id: "apt-2",
        date: new Date("2026-03-11T00:00:00Z"),
        startTime: "10:00",
        status: "COMPLETED",
        service: { name: "Barba", price: 30 },
        barber: { name: "Carlos" },
      },
    ]);

    const response = await GET(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("COMPLETED");
  });
});
