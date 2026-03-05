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
    profile: { findUnique: vi.fn(), count: vi.fn() },
    barber: { findUnique: vi.fn(), count: vi.fn() },
    appointment: { findMany: vi.fn() },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

const PROFILE_FIXTURE = {
  id: "profile-1",
  userId: "user-1",
  fullName: "João Silva",
  phone: "11999999999",
  role: "CLIENT",
};

const BARBER_PROFILE_FIXTURE = {
  id: "barber-1",
  userId: "user-1",
  name: "Carlos",
  avatarUrl: null,
  active: true,
};

const PAST_APPOINTMENT = {
  id: "apt-1",
  date: new Date("2025-01-15T00:00:00.000Z"),
  startTime: "10:00",
  endTime: "10:30",
  status: "COMPLETED",
  barberId: "barber-1",
  serviceId: "svc-1",
  clientId: "profile-1",
  barber: { id: "barber-1", name: "Carlos", avatarUrl: null },
  service: {
    id: "svc-1",
    name: "Corte",
    price: 45.0,
    duration: 30,
    slug: "corte",
  },
  client: { fullName: "João" },
  guestClient: null,
};

describe("GET /api/dashboard/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No auth" },
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("returns 404 when profile not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns client stats for CLIENT role", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(
      PROFILE_FIXTURE as never,
    );
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      PAST_APPOINTMENT,
    ] as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.role).toBe("CLIENT");
    expect(json.data.client).not.toBeNull();
    expect(json.data.client.totalVisits).toBe(1);
    expect(json.data.client.totalSpent).toBe(45);
    expect(json.data.barber).toBeNull();
    expect(json.data.admin).toBeNull();
  });

  it("includes barber stats when user has barber profile", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...PROFILE_FIXTURE,
      role: "BARBER",
    } as never);
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_PROFILE_FIXTURE as never,
    );
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.client).not.toBeNull();
    expect(json.data.barber).not.toBeNull();
    expect(json.data.barber.todayAppointments).toBe(0);
  });

  it("includes admin stats for ADMIN role", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...PROFILE_FIXTURE,
      role: "ADMIN",
    } as never);
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.barber.count).mockResolvedValue(3 as never);
    vi.mocked(prisma.profile.count).mockResolvedValue(50 as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.admin).not.toBeNull();
    expect(json.data.admin.activeBarbers).toBe(3);
    expect(json.data.admin.totalClients).toBe(50);
  });

  it("returns 500 on Prisma failure", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.profile.findUnique).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
