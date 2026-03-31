import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireBarber = vi.fn();
const mockAppointmentCount = vi.fn();
const mockAppointmentFindMany = vi.fn();

vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: (...args: unknown[]) => mockRequireBarber(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      count: (...args: unknown[]) => mockAppointmentCount(...args),
      findMany: (...args: unknown[]) => mockAppointmentFindMany(...args),
    },
  },
}));

import { GET } from "../route";

function createRequest(params = "") {
  return new Request(
    `http://localhost:3001/api/barbers/me/cancelled-appointments${params ? `?${params}` : ""}`,
    { method: "GET" },
  );
}

describe("GET /api/barbers/me/cancelled-appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error when requireBarber fails", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(401);
  });

  it("returns paginated cancelled appointments", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      barberId: "barber-1",
    });
    mockAppointmentCount.mockResolvedValue(1);
    mockAppointmentFindMany.mockResolvedValue([
      {
        id: "apt-1",
        date: new Date("2026-03-10T00:00:00Z"),
        startTime: "09:00",
        status: "CANCELLED_BY_CLIENT",
        cancelReason: "Não posso ir",
        client: { fullName: "João" },
        guestClient: null,
        service: { name: "Corte", price: 50 },
        barber: { name: "Carlos" },
      },
    ]);

    const response = await GET(createRequest("page=1&limit=20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].cancelledBy).toBe("CLIENT");
    expect(body.data[0].clientName).toBe("João");
    expect(body.data[0].servicePrice).toBe(50);
    expect(mockAppointmentCount).toHaveBeenCalledWith({
      where: {
        status: { in: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_BARBER"] },
        barberId: "barber-1",
      },
    });
    expect(mockAppointmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_BARBER"] },
          barberId: "barber-1",
        },
      }),
    );
  });

  it("uses guest client name when client is null", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      barberId: "barber-1",
    });
    mockAppointmentCount.mockResolvedValue(1);
    mockAppointmentFindMany.mockResolvedValue([
      {
        id: "apt-2",
        date: new Date("2026-03-10T00:00:00Z"),
        startTime: "10:00",
        status: "CANCELLED_BY_BARBER",
        cancelReason: "Emergência",
        client: null,
        guestClient: { fullName: "Pedro Guest" },
        service: { name: "Barba", price: 30 },
        barber: { name: "Carlos" },
      },
    ]);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data[0].cancelledBy).toBe("BARBER");
    expect(body.data[0].clientName).toBe("Pedro Guest");
  });

  it("falls back to 'Cliente' when both client and guest are null", async () => {
    mockRequireBarber.mockResolvedValue({
      ok: true,
      barberId: "barber-1",
    });
    mockAppointmentCount.mockResolvedValue(1);
    mockAppointmentFindMany.mockResolvedValue([
      {
        id: "apt-3",
        date: new Date("2026-03-10T00:00:00Z"),
        startTime: "11:00",
        status: "CANCELLED_BY_CLIENT",
        cancelReason: null,
        client: null,
        guestClient: null,
        service: { name: "Corte", price: 40 },
        barber: { name: "Carlos" },
      },
    ]);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data[0].clientName).toBe("Cliente");
  });
});
