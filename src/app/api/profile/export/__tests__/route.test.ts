import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    appointment: { findMany: vi.fn() },
    cookieConsent: { findMany: vi.fn() },
  },
}));

import { GET } from "../route";

const USER_ID = "660e8400-e29b-41d4-a716-446655440001";
const PROFILE_ID = "profile-abc-123";
const NOW = new Date("2026-03-01T12:00:00.000Z");

function rateLimitOk() {
  mockCheckRateLimit.mockResolvedValue({
    success: true,
    remaining: 2,
    reset: NOW.getTime() + 60_000,
  });
}

function rateLimitBlocked() {
  mockCheckRateLimit.mockResolvedValue({
    success: false,
    remaining: 0,
    reset: NOW.getTime() + 60_000,
  });
}

function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: "joao@example.com",
    created_at: "2026-01-01T00:00:00.000Z",
    last_sign_in_at: "2026-03-01T10:00:00.000Z",
    app_metadata: { provider: "google" },
    ...overrides,
  };
}

function authenticated(user = mockUser()) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: () => ({ data: { user } }) },
  });
}

function unauthenticated() {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: () => ({ data: { user: null } }) },
  });
}

function mockProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: PROFILE_ID,
    userId: USER_ID,
    fullName: "João Silva",
    phone: "11999999999",
    emailVerified: true,
    role: "CLIENT",
    street: "Rua das Flores",
    number: "100",
    complement: "Apto 42",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01000-000",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function mockAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: "apt-1",
    date: new Date("2026-02-15"),
    startTime: "10:00",
    endTime: "10:30",
    status: "COMPLETED",
    cancelReason: null,
    barber: { name: "Carlos" },
    service: { name: "Corte", price: 50, duration: 30 },
    createdAt: new Date("2026-02-10T08:00:00.000Z"),
    ...overrides,
  };
}

function mockCookieConsent(overrides: Record<string, unknown> = {}) {
  return {
    id: "consent-1",
    analyticsConsent: true,
    marketingConsent: false,
    consentDate: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createRequest(): Request {
  return {
    url: "http://localhost:3001/api/profile/export",
    headers: { get: () => null },
  } as unknown as Request;
}

async function setupFullExport(
  appointments = [mockAppointment()],
  consents = [mockCookieConsent()],
) {
  rateLimitOk();
  authenticated();
  const { prisma } = await import("@/lib/prisma");
  vi.mocked(prisma.profile.findUnique).mockResolvedValue(
    mockProfile() as never,
  );
  vi.mocked(prisma.appointment.findMany).mockResolvedValue(
    appointments as never,
  );
  vi.mocked(prisma.cookieConsent.findMany).mockResolvedValue(consents as never);
  return prisma;
}

describe("GET /api/profile/export", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    mockGetClientIdentifier.mockReturnValue("127.0.0.1");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 429 when rate limited", async () => {
    rateLimitBlocked();

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
    expect(mockCheckRateLimit).toHaveBeenCalledWith("sensitive", "127.0.0.1");
  });

  it("returns 401 when unauthenticated", async () => {
    rateLimitOk();
    unauthenticated();

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 404 when profile not found", async () => {
    rateLimitOk();
    authenticated();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns full export with all sections", async () => {
    const prisma = await setupFullExport();

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveProperty("exportInfo");
    expect(body.data).toHaveProperty("account");
    expect(body.data).toHaveProperty("profile");
    expect(body.data).toHaveProperty("appointments");
    expect(body.data).toHaveProperty("cookieConsents");
    expect(body.data).toHaveProperty("summary");

    expect(prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith({
      where: { clientId: PROFILE_ID },
      include: {
        barber: { select: { name: true } },
        service: { select: { name: true, price: true, duration: true } },
      },
      orderBy: { date: "desc" },
    });
    expect(prisma.cookieConsent.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { consentDate: "desc" },
    });
  });

  it("includes correct export info metadata", async () => {
    await setupFullExport();

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data.exportInfo).toEqual({
      exportedAt: NOW.toISOString(),
      format: "JSON",
      version: "1.0",
      description:
        "Exportação de dados pessoais conforme LGPD (Lei 13.709/2018)",
    });
  });

  it("maps account data correctly", async () => {
    await setupFullExport();

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data.account).toEqual({
      id: USER_ID,
      email: "joao@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastSignIn: "2026-03-01T10:00:00.000Z",
      provider: "google",
    });
  });

  it("defaults provider to email when app_metadata is missing", async () => {
    rateLimitOk();
    authenticated(mockUser({ app_metadata: {} }));
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(
      mockProfile() as never,
    );
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.cookieConsent.findMany).mockResolvedValue([] as never);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data.account.provider).toBe("email");
  });

  it("maps profile data with nested address", async () => {
    await setupFullExport();

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data.profile).toEqual({
      id: PROFILE_ID,
      fullName: "João Silva",
      phone: "11999999999",
      emailVerified: true,
      role: "CLIENT",
      address: {
        street: "Rua das Flores",
        number: "100",
        complement: "Apto 42",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01000-000",
      },
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it("maps appointment fields correctly", async () => {
    await setupFullExport();

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data.appointments).toHaveLength(1);
    expect(body.data.appointments[0]).toEqual({
      id: "apt-1",
      date: "2026-02-15",
      startTime: "10:00",
      endTime: "10:30",
      status: "COMPLETED",
      cancelReason: null,
      barber: "Carlos",
      service: { name: "Corte", price: 50, duration: 30 },
      createdAt: new Date("2026-02-10T08:00:00.000Z").toISOString(),
    });
  });

  it("calculates summary with mixed appointment statuses", async () => {
    const appointments = [
      mockAppointment({ id: "a1", status: "COMPLETED" }),
      mockAppointment({ id: "a2", status: "COMPLETED" }),
      mockAppointment({ id: "a3", status: "CANCELLED_BY_CLIENT" }),
      mockAppointment({ id: "a4", status: "CANCELLED_BY_BARBER" }),
      mockAppointment({ id: "a5", status: "CONFIRMED" }),
    ];
    const consents = [mockCookieConsent(), mockCookieConsent({ id: "c2" })];
    await setupFullExport(appointments, consents);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data.summary).toEqual({
      totalAppointments: 5,
      completedAppointments: 2,
      cancelledAppointments: 2,
      totalConsentRecords: 2,
    });
  });

  it("handles empty appointments array", async () => {
    await setupFullExport([], [mockCookieConsent()]);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data.appointments).toEqual([]);
    expect(body.data.summary.totalAppointments).toBe(0);
    expect(body.data.summary.completedAppointments).toBe(0);
    expect(body.data.summary.cancelledAppointments).toBe(0);
  });

  it("handles empty cookie consents array", async () => {
    await setupFullExport([mockAppointment()], []);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(body.data.cookieConsents).toEqual([]);
    expect(body.data.summary.totalConsentRecords).toBe(0);
  });

  it("sets correct response headers for file download", async () => {
    await setupFullExport();

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );

    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(
      `gold-mustache-dados-${USER_ID.slice(0, 8)}-2026-03-01.json`,
    );
  });

  it("delegates to handlePrismaError on database error", async () => {
    rateLimitOk();
    authenticated();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.profile.findUnique).mockRejectedValue(
      new Error("DB error"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
