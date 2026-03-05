import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
    }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    barber: { findMany: vi.fn() },
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

function authenticatedAdmin() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "admin-user-id" } },
  });
  vi.mocked(prisma.profile.findUnique).mockResolvedValue({
    role: "ADMIN",
  } as never);
}

function createRequest(params: string): Request {
  return new Request(`http://localhost:3001/api/admin/financial?${params}`);
}

describe("GET /api/admin/financial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.barberAbsence.findMany).mockResolvedValue([] as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(createRequest("month=1&year=2025"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("returns 403 when user is not admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      role: "CLIENT",
    } as never);

    const response = await GET(createRequest("month=1&year=2025"));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBe("FORBIDDEN");
  });

  it("returns 400 for invalid query params", async () => {
    authenticatedAdmin();

    const response = await GET(createRequest("month=13&year=2025"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("returns aggregate stats for all barbers", async () => {
    authenticatedAdmin();
    vi.mocked(prisma.barber.findMany).mockResolvedValue([
      { id: "barber-1", name: "Carlos" },
    ] as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      APPOINTMENT_FIXTURE,
    ] as never);

    const response = await GET(createRequest("month=1&year=2025"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.barberName).toBe("Todos os Barbeiros");
    expect(json.data.stats.totalRevenue).toBe(45);
    expect(json.data.stats.totalAppointments).toBe(1);
    expect(json.data.barbers).toHaveLength(1);
  });

  it("returns stats for specific barber", async () => {
    authenticatedAdmin();
    const barberId = "550e8400-e29b-41d4-a716-446655440000";
    vi.mocked(prisma.barber.findMany).mockResolvedValue([
      { id: barberId, name: "Carlos" },
    ] as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { ...APPOINTMENT_FIXTURE, barberId },
    ] as never);

    const response = await GET(
      createRequest(`month=1&year=2025&barberId=${barberId}`),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.barberName).toBe("Carlos");
    expect(json.data.stats.totalRevenue).toBe(45);
  });

  it("returns 404 when barberId not found", async () => {
    authenticatedAdmin();
    vi.mocked(prisma.barber.findMany).mockResolvedValue([
      { id: "barber-1", name: "Carlos" },
    ] as never);

    const response = await GET(
      createRequest(
        "month=1&year=2025&barberId=550e8400-e29b-41d4-a716-446655440000",
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns zero stats when no appointments", async () => {
    authenticatedAdmin();
    vi.mocked(prisma.barber.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);

    const response = await GET(createRequest("month=1&year=2025"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.stats.totalRevenue).toBe(0);
    expect(json.data.stats.totalAppointments).toBe(0);
    expect(json.data.stats.ticketMedio).toBe(0);
    expect(json.data.stats.occupancyRate).toBe(0);
  });

  it("returns 500 on Prisma failure", async () => {
    authenticatedAdmin();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barber.findMany).mockRejectedValue(new Error("DB down"));

    const response = await GET(createRequest("month=1&year=2025"));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
