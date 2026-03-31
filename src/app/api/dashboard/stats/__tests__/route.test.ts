import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockGetUser = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetUserRateLimitIdentifier = vi.fn();

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

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getUserRateLimitIdentifier: (...args: unknown[]) =>
    mockGetUserRateLimitIdentifier(...args),
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
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetUserRateLimitIdentifier.mockImplementation((userId: unknown) => {
      return `auth:${String(userId)}`;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.error).toBe("RATE_LIMITED");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No auth" },
    });

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("returns 404 when profile not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null as never);

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);
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

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.role).toBe("CLIENT");
    expect(json.data.client).not.toBeNull();
    expect(json.data.client.totalVisits).toBe(1);
    expect(json.data.client.totalSpent).toBe(45);
    expect(json.data.barber).toBeNull();
    expect(json.data.admin).toBeNull();
    expect(mockCheckRateLimit).toHaveBeenCalledWith("api", "auth:user-1");
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

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.client).not.toBeNull();
    expect(json.data.barber).not.toBeNull();
    expect(json.data.barber.todayAppointments).toBe(0);
  });

  it("uses Sao Paulo business day for barber today stats near UTC midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T02:30:00.000Z"));

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
    vi.mocked(prisma.appointment.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          ...PAST_APPOINTMENT,
          id: "apt-late-today",
          date: new Date("2025-01-14T00:00:00.000Z"),
          startTime: "23:45",
          endTime: "00:15",
          status: "CONFIRMED",
        },
      ] as never);

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.barber.todayAppointments).toBe(1);
    expect(json.data.barber.nextClient.time).toBe("23:45");

    vi.useRealTimers();
  });

  it("ignores confirmed appointments that already started today in client upcoming stats", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:00:00.000Z"));

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(
      PROFILE_FIXTURE as never,
    );
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        ...PAST_APPOINTMENT,
        id: "apt-past-today",
        date: new Date("2025-01-15T00:00:00.000Z"),
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
      },
      {
        ...PAST_APPOINTMENT,
        id: "apt-upcoming",
        date: new Date("2025-01-15T00:00:00.000Z"),
        startTime: "18:00",
        endTime: "18:30",
        status: "CONFIRMED",
      },
    ] as never);

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.client.nextAppointment.id).toBe("apt-upcoming");
    expect(json.data.client.upcomingCount).toBe(1);
    expect(json.data.client.totalVisits).toBe(1);

    vi.useRealTimers();
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

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.admin).not.toBeNull();
    expect(json.data.admin.activeBarbers).toBe(3);
    expect(json.data.admin.totalClients).toBe(50);
  });

  it("queries admin today stats using Sao Paulo business date near UTC midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T02:30:00.000Z"));

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...PROFILE_FIXTURE,
      role: "ADMIN",
    } as never);
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.appointment.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(prisma.barber.count).mockResolvedValue(3 as never);
    vi.mocked(prisma.profile.count).mockResolvedValue(50 as never);

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    await GET(request);

    expect(vi.mocked(prisma.appointment.findMany)).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          date: new Date("2025-01-14T00:00:00.000Z"),
        }),
      }),
    );

    vi.useRealTimers();
  });

  it("includes Cache-Control header on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(
      PROFILE_FIXTURE as never,
    );
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "private, s-maxage=30, stale-while-revalidate=60",
    );
  });

  it("returns 500 on Prisma failure", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.profile.findUnique).mockRejectedValue(
      new Error("DB down"),
    );

    const request = new Request("http://localhost:3001/api/dashboard/stats");
    const response = await GET(request);

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
