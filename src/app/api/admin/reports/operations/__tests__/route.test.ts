import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "../route";

function adminAuthenticated() {
  mockRequireAdmin.mockResolvedValue({
    ok: true,
    userId: "admin-user-id",
    profileId: "admin-profile-id",
    role: "ADMIN",
  });
}

function adminUnauthorized() {
  mockRequireAdmin.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireAdminResult);
}

function createRequest(query = "") {
  return new Request(
    `http://localhost:3001/api/admin/reports/operations${query ? `?${query}` : ""}`,
  );
}

describe("GET /api/admin/reports/operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminAuthenticated();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt-1",
        barberId: "barber-1",
        service: { price: 90 },
        barber: { name: "Carlos" },
      },
      {
        id: "apt-2",
        barberId: "barber-1",
        service: { price: 60 },
        barber: { name: "Carlos" },
      },
    ] as never);
    vi.mocked(prisma.appointment.groupBy)
      .mockResolvedValueOnce([
        { clientId: "client-1", _max: { date: new Date("2026-01-01") } },
        { clientId: "client-2", _max: { date: new Date("2026-03-20") } },
      ] as never)
      .mockResolvedValueOnce([
        { guestClientId: "guest-1", _max: { date: new Date("2026-02-01") } },
      ] as never);
  });

  it("retorna 401 quando não autenticado como admin", async () => {
    adminUnauthorized();

    const response = await GET(createRequest());
    expect(response.status).toBe(401);
  });

  it("retorna 400 para query inválida", async () => {
    const response = await GET(createRequest("month=13&year=2026"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("retorna resumo de no-show e retenção", async () => {
    const response = await GET(createRequest("month=3&year=2026"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.period).toMatchObject({
      month: 3,
      year: 2026,
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    expect(json.data.noShow).toMatchObject({
      totalNoShows: 2,
      totalLostRevenue: 150,
    });
    expect(json.data.noShow.byBarber).toEqual([
      {
        barberId: "barber-1",
        barberName: "Carlos",
        noShowCount: 2,
        lostRevenue: 150,
      },
    ]);
    expect(json.data.retention.registeredClients.totalWithHistory).toBe(2);
    expect(json.data.retention.guestClients.totalWithHistory).toBe(1);
  });

  it("aplica filtros de período na consulta de no-show", async () => {
    await GET(createRequest("month=3&year=2026"));

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "NO_SHOW",
          date: {
            gte: new Date("2026-03-01T00:00:00.000Z"),
            lt: new Date("2026-04-01T00:00:00.000Z"),
          },
        }),
      }),
    );
  });
});
