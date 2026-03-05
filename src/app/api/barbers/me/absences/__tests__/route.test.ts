import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barberAbsence: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const ABSENCE_FIXTURE = {
  id: "abs-1",
  barberId: "barber-1",
  date: new Date("2026-03-15T00:00:00.000Z"),
  startTime: null,
  endTime: null,
  reason: "Consulta médica",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const APPOINTMENT_FIXTURE = {
  id: "apt-1",
  startTime: "10:00",
  endTime: "11:00",
  service: { name: "Corte Masculino" },
  client: { fullName: "João Silva" },
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

function createGetRequest(params = ""): Request {
  return new Request(
    `http://localhost:3001/api/barbers/me/absences${params ? `?${params}` : ""}`,
  );
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/barbers/me/absences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/barbers/me/absences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(401);
  });

  it("returns list of absences", async () => {
    barberAuthenticated();
    vi.mocked(prisma.barberAbsence.findMany).mockResolvedValue([
      ABSENCE_FIXTURE,
    ] as never);

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].reason).toBe("Consulta médica");
  });

  it("filters absences by barberId", async () => {
    barberAuthenticated();
    vi.mocked(prisma.barberAbsence.findMany).mockResolvedValue([] as never);

    await GET(createGetRequest());

    const call = vi.mocked(prisma.barberAbsence.findMany).mock.calls[0][0] as {
      where: { barberId: string };
    };
    expect(call.where.barberId).toBe("barber-1");
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barberAbsence.findMany).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("POST /api/barbers/me/absences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await POST(createPostRequest({ date: "2026-03-15" }));

    expect(response.status).toBe(401);
  });

  it("returns 422 for invalid body", async () => {
    barberAuthenticated();

    const response = await POST(createPostRequest({}));
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("creates full-day absence when no conflicts", async () => {
    barberAuthenticated();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.barberAbsence.create).mockResolvedValue(
      ABSENCE_FIXTURE as never,
    );

    const response = await POST(
      createPostRequest({ date: "2026-03-15", reason: "Consulta médica" }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.reason).toBe("Consulta médica");
  });

  it("creates partial-day absence when no time conflicts", async () => {
    barberAuthenticated();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { ...APPOINTMENT_FIXTURE, startTime: "14:00", endTime: "15:00" },
    ] as never);
    vi.mocked(prisma.barberAbsence.create).mockResolvedValue({
      ...ABSENCE_FIXTURE,
      startTime: "09:00",
      endTime: "12:00",
    } as never);

    const response = await POST(
      createPostRequest({
        date: "2026-03-15",
        startTime: "09:00",
        endTime: "12:00",
      }),
    );

    expect(response.status).toBe(201);
  });

  it("returns 409 when full-day absence conflicts with appointments", async () => {
    barberAuthenticated();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      APPOINTMENT_FIXTURE,
    ] as never);

    const response = await POST(createPostRequest({ date: "2026-03-15" }));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("ABSENCE_CONFLICT");
    expect(json.details).toHaveLength(1);
    expect(json.details[0].clientName).toBe("João Silva");
  });

  it("returns 409 when partial absence overlaps with appointment", async () => {
    barberAuthenticated();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      APPOINTMENT_FIXTURE,
    ] as never);

    const response = await POST(
      createPostRequest({
        date: "2026-03-15",
        startTime: "09:00",
        endTime: "10:30",
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("ABSENCE_CONFLICT");
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.barberAbsence.create).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await POST(createPostRequest({ date: "2026-03-15" }));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
