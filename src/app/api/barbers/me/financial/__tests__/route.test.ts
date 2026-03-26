import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: { findMany: vi.fn() },
    workingHours: { findMany: vi.fn() },
    barberAbsence: { findMany: vi.fn() },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

const APPOINTMENT_FIXTURE = {
  id: "apt-1",
  date: new Date("2025-01-15T00:00:00.000Z"),
  startTime: "10:00",
  endTime: "10:30",
  status: "COMPLETED",
  barberId: "barber-1",
  serviceId: "svc-1",
  service: { id: "svc-1", name: "Corte", price: 45.0, duration: 30 },
  client: { id: "client-1" },
  guestClient: null,
};

function barberAuthenticated() {
  mockRequireBarber.mockResolvedValue({
    ok: true,
    userId: "user-1",
    barberId: "barber-1",
    barberName: "Carlos",
  });
}

function barberUnauthorized() {
  mockRequireBarber.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireBarberResult);
}

function createRequest(params: string): Request {
  return new Request(
    `http://localhost:3001/api/barbers/me/financial?${params}`,
  );
}

describe("GET /api/barbers/me/financial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.barberAbsence.findMany).mockResolvedValue([] as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await GET(createRequest("month=1&year=2025"));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid query params", async () => {
    barberAuthenticated();

    const response = await GET(createRequest("month=0&year=2025"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when params missing", async () => {
    barberAuthenticated();

    const response = await GET(createRequest(""));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("returns financial stats with barberName", async () => {
    barberAuthenticated();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      APPOINTMENT_FIXTURE,
    ] as never);

    const response = await GET(createRequest("month=1&year=2025"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.barberName).toBe("Carlos");
    expect(json.data.stats.totalRevenue).toBe(45);
    expect(json.data.stats.totalAppointments).toBe(1);
    expect(json.data.stats.serviceBreakdown).toHaveLength(1);
    expect(json.data.stats.serviceBreakdown[0].name).toBe("Corte");
  });

  it("returns zero stats when no appointments", async () => {
    barberAuthenticated();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);

    const response = await GET(createRequest("month=1&year=2025"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.stats.totalRevenue).toBe(0);
    expect(json.data.stats.totalAppointments).toBe(0);
    expect(json.data.stats.ticketMedio).toBe(0);
  });

  it("counts unique clients from both registered and guest", async () => {
    barberAuthenticated();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      APPOINTMENT_FIXTURE,
      {
        ...APPOINTMENT_FIXTURE,
        id: "apt-2",
        client: null,
        guestClient: { id: "guest-1" },
      },
      {
        ...APPOINTMENT_FIXTURE,
        id: "apt-3",
        client: { id: "client-1" },
        guestClient: null,
      },
    ] as never);

    const response = await GET(createRequest("month=1&year=2025"));
    const json = await response.json();

    expect(json.data.stats.uniqueClients).toBe(2);
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.appointment.findMany).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET(createRequest("month=1&year=2025"));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
