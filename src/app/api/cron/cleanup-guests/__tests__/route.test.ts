import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guestClient: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/config/api", () => ({
  API_CONFIG: {
    cron: { guestCleanupBatchSize: 2 },
  },
}));

import { POST } from "../route";

const CRON_SECRET = "test-cron-secret";
const NOW = new Date("2026-03-01T12:00:00.000Z");
const TWO_YEARS_AGO = new Date("2024-03-01T12:00:00.000Z");

function createRequest(secret?: string): Request {
  return {
    headers: {
      get: (name: string) => {
        if (name === "authorization" && secret) return `Bearer ${secret}`;
        return null;
      },
    },
  } as unknown as Request;
}

function guestStub(id: string) {
  return { id, createdAt: new Date("2023-06-15"), _count: { appointments: 1 } };
}

describe("POST /api/cron/cleanup-guests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when CRON_SECRET env is not set", async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("CONFIG_ERROR");
  });

  it("returns 401 when authorization header is missing", async () => {
    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 401 when authorization header has wrong secret", async () => {
    const response = await POST(createRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns anonymized 0 when no guests need cleanup", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([]);

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.anonymized).toBe(0);
    expect(body.data.message).toContain("Nenhum guest");
  });

  it("queries guests with correct where clause and select", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([]);

    await POST(createRequest(CRON_SECRET));

    expect(prisma.guestClient.findMany).toHaveBeenCalledWith({
      where: {
        NOT: { phone: { startsWith: "DELETED_" } },
        appointments: { none: { date: { gte: TWO_YEARS_AGO } } },
      },
      select: {
        id: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
    });
  });

  it("anonymizes guests with correct LGPD data", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([
      guestStub("guest-42"),
    ] as never);
    vi.mocked(prisma.guestClient.update).mockReturnValue({} as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await POST(createRequest(CRON_SECRET));

    expect(prisma.guestClient.update).toHaveBeenCalledWith({
      where: { id: "guest-42" },
      data: {
        fullName: "[DADOS REMOVIDOS POR INATIVIDADE]",
        phone: "DELETED_guest-42",
        accessToken: null,
      },
    });
  });

  it("returns correct response shape with cutoffDate and timestamp", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([
      guestStub("g-1"),
    ] as never);
    vi.mocked(prisma.guestClient.update).mockReturnValue({} as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(body.data).toEqual({
      message: "Limpeza concluída com sucesso",
      anonymized: 1,
      cutoffDate: TWO_YEARS_AGO.toISOString(),
      timestamp: NOW.toISOString(),
    });
  });

  it("processes guests in batches of configured size", async () => {
    const { prisma } = await import("@/lib/prisma");
    const guests = [guestStub("g-1"), guestStub("g-2"), guestStub("g-3")];
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue(guests as never);
    vi.mocked(prisma.guestClient.update).mockReturnValue({} as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(body.data.anonymized).toBe(3);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.guestClient.update).toHaveBeenCalledTimes(3);
  });

  it("passes update operations as array to $transaction", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([
      guestStub("g-1"),
    ] as never);
    const updateOp = { __mockOp: true };
    vi.mocked(prisma.guestClient.update).mockReturnValue(updateOp as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await POST(createRequest(CRON_SECRET));

    expect(prisma.$transaction).toHaveBeenCalledWith([updateOp]);
  });

  it("delegates to handlePrismaError on findMany error", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findMany).mockRejectedValue(
      new Error("DB error"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });

  it("delegates to handlePrismaError on $transaction error", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([
      guestStub("g-1"),
    ] as never);
    vi.mocked(prisma.guestClient.update).mockReturnValue({} as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error("Transaction failed"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
