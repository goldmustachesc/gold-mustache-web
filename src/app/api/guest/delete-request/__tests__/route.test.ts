import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guestClient: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "../route";

const GUEST_ID = "guest-abc-123";
const VALID_TOKEN = "a7e5f8c1-4b32-4d56-8a71-9f2e3c7d8b1e";
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

function createRequest(body: unknown): Request {
  return {
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request;
}

function guestRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: GUEST_ID,
    fullName: "João Visitante",
    phone: "11999887766",
    accessToken: VALID_TOKEN,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("POST /api/guest/delete-request", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    mockGetClientIdentifier.mockReturnValue("127.0.0.1");
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 429 when rate limited", async () => {
    rateLimitBlocked();

    const response = await POST(createRequest({ phone: "11999887766" }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
    expect(mockCheckRateLimit).toHaveBeenCalledWith("sensitive", "127.0.0.1");
  });

  it("returns 422 for missing phone", async () => {
    rateLimitOk();

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 for invalid phone format (letters)", async () => {
    rateLimitOk();

    const response = await POST(createRequest({ phone: "abc12345678" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 for phone with wrong length", async () => {
    rateLimitOk();

    const response = await POST(createRequest({ phone: "12345" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 for invalid accessToken UUID", async () => {
    rateLimitOk();

    const response = await POST(
      createRequest({ phone: "11999887766", accessToken: "bad-token" }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns generic success when guest not found (security)", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null);

    const response = await POST(createRequest({ phone: "11999887766" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("processada para exclusão");
  });

  it("returns 403 for invalid access token", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      guestRecord() as never,
    );

    const wrongToken = "00000000-0000-0000-0000-000000000000";
    const response = await POST(
      createRequest({ phone: "11999887766", accessToken: wrongToken }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("INVALID_TOKEN");
  });

  it("anonymizes guest data immediately with valid access token", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      guestRecord() as never,
    );
    vi.mocked(prisma.guestClient.update).mockResolvedValue(
      guestRecord({
        fullName: "[DADOS REMOVIDOS]",
        phone: `DELETED_${GUEST_ID}`,
        accessToken: null,
      }) as never,
    );

    const response = await POST(
      createRequest({ phone: "11999887766", accessToken: VALID_TOKEN }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.immediate).toBe(true);
    expect(body.data.message).toContain("removidos com sucesso");
    expect(prisma.guestClient.update).toHaveBeenCalledWith({
      where: { id: GUEST_ID },
      data: {
        fullName: "[DADOS REMOVIDOS]",
        phone: `DELETED_${GUEST_ID}`,
        accessToken: null,
      },
    });
  });

  it("returns manual review message without access token", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      guestRecord() as never,
    );

    const response = await POST(createRequest({ phone: "11999887766" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.immediate).toBe(false);
    expect(body.data.message).toContain("15 dias conforme a LGPD");
  });

  it("passes normalized phone to findUnique", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null);

    await POST(createRequest({ phone: "11999887766" }));

    expect(prisma.guestClient.findUnique).toHaveBeenCalledWith({
      where: { phone: "11999887766" },
    });
  });

  it("logs audit info on successful anonymization", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      guestRecord() as never,
    );
    vi.mocked(prisma.guestClient.update).mockResolvedValue(
      guestRecord() as never,
    );

    await POST(
      createRequest({ phone: "11999887766", accessToken: VALID_TOKEN }),
    );

    expect(console.info).toHaveBeenCalledWith(
      "[Guest Delete] Guest data anonymized immediately:",
      expect.objectContaining({ guestId: GUEST_ID }),
    );
  });

  it("logs audit info for manual review request", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      guestRecord() as never,
    );

    await POST(createRequest({ phone: "11999887766" }));

    expect(console.info).toHaveBeenCalledWith(
      "[Guest Delete] Deletion request received for processing:",
      expect.objectContaining({ guestId: GUEST_ID }),
    );
  });

  it("accepts both 10 and 11 digit phone numbers", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null);

    const response10 = await POST(createRequest({ phone: "1199988776" }));
    expect(response10.status).toBe(200);

    vi.clearAllMocks();
    mockGetClientIdentifier.mockReturnValue("127.0.0.1");
    rateLimitOk();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null);
    vi.spyOn(console, "info").mockImplementation(() => {});

    const response11 = await POST(createRequest({ phone: "11999887766" }));
    expect(response11.status).toBe(200);
  });

  it("delegates to handlePrismaError on database error", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockRejectedValue(
      new Error("DB error"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(createRequest({ phone: "11999887766" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });

  it("delegates to handlePrismaError when update fails", async () => {
    rateLimitOk();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      guestRecord() as never,
    );
    vi.mocked(prisma.guestClient.update).mockRejectedValue(
      new Error("Update failed"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(
      createRequest({ phone: "11999887766", accessToken: VALID_TOKEN }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
