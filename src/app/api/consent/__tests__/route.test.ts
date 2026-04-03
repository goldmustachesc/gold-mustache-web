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
    cookieConsent: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { GET, POST } from "../route";

const ANON_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "660e8400-e29b-41d4-a716-446655440001";
const NOW = new Date("2026-03-01T12:00:00.000Z");

function rateLimitOk() {
  mockCheckRateLimit.mockResolvedValue({
    success: true,
    remaining: 99,
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

function authenticated(id = USER_ID) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: () => ({ data: { user: { id } } }) },
  });
}

function unauthenticated() {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: () => ({ data: { user: null } }) },
  });
}

function getRequest(params = ""): Request {
  return {
    url: `http://localhost:3001/api/consent${params ? `?${params}` : ""}`,
    headers: { get: () => null },
  } as unknown as Request;
}

function postRequest(body: unknown, userAgent = "TestAgent/1.0"): Request {
  return {
    url: "http://localhost:3001/api/consent",
    json: async () => body,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === "user-agent") return userAgent;
        return null;
      },
    },
  } as unknown as Request;
}

function consentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "consent-1",
    userId: USER_ID,
    anonymousId: null,
    analyticsConsent: true,
    marketingConsent: false,
    ipAddress: "127.0.0.1",
    userAgent: "TestAgent/1.0",
    consentDate: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("/api/consent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    mockGetClientIdentifier.mockReturnValue("127.0.0.1");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("GET", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitBlocked();

      const response = await GET(getRequest(`anonymousId=${ANON_ID}`));
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe("RATE_LIMITED");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
      expect(mockCheckRateLimit).toHaveBeenCalledWith("api", "127.0.0.1");
    });

    it("returns 422 for invalid anonymousId format", async () => {
      rateLimitOk();

      const response = await GET(getRequest("anonymousId=not-a-uuid"));
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error).toBe("VALIDATION_ERROR");
      expect(body.details).toBeDefined();
    });

    it("returns 422 when anonymousId query param is absent (null)", async () => {
      rateLimitOk();

      const response = await GET(getRequest());
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns consent for anonymous visitor when found", async () => {
      rateLimitOk();
      unauthenticated();
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.cookieConsent.findFirst).mockResolvedValue(
        consentRecord({ userId: null, anonymousId: ANON_ID }) as never,
      );

      const response = await GET(getRequest(`anonymousId=${ANON_ID}`));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.hasConsent).toBe(true);
      expect(body.data.consent).toEqual({
        id: "consent-1",
        analyticsConsent: true,
        marketingConsent: false,
        consentDate: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      });
    });

    it("returns hasConsent false for anonymous visitor when not found", async () => {
      rateLimitOk();
      unauthenticated();
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.cookieConsent.findFirst).mockResolvedValue(null);

      const response = await GET(getRequest(`anonymousId=${ANON_ID}`));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.hasConsent).toBe(false);
      expect(body.data.consent).toBeNull();
    });

    it("returns consent for authenticated user when found", async () => {
      rateLimitOk();
      authenticated();
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.cookieConsent.findFirst).mockResolvedValue(
        consentRecord() as never,
      );

      const response = await GET(getRequest(`anonymousId=${ANON_ID}`));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.hasConsent).toBe(true);
      expect(body.data.consent.id).toBe("consent-1");
    });

    it("returns hasConsent false for authenticated user when not found", async () => {
      rateLimitOk();
      authenticated();
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.cookieConsent.findFirst).mockResolvedValue(null);

      const response = await GET(getRequest(`anonymousId=${ANON_ID}`));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.hasConsent).toBe(false);
      expect(body.data.consent).toBeNull();
    });

    it("queries by userId only when authenticated (ignores anonymousId)", async () => {
      rateLimitOk();
      authenticated();
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.cookieConsent.findFirst).mockResolvedValue(null);

      await GET(getRequest(`anonymousId=${ANON_ID}`));

      expect(prisma.cookieConsent.findFirst).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { consentDate: "desc" },
      });
    });

    it("queries only by anonymousId when unauthenticated", async () => {
      rateLimitOk();
      unauthenticated();
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.cookieConsent.findFirst).mockResolvedValue(null);

      await GET(getRequest(`anonymousId=${ANON_ID}`));

      expect(prisma.cookieConsent.findFirst).toHaveBeenCalledWith({
        where: { anonymousId: ANON_ID },
        orderBy: { consentDate: "desc" },
      });
    });

    it("delegates to handlePrismaError on database error", async () => {
      rateLimitOk();
      unauthenticated();
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.cookieConsent.findFirst).mockRejectedValue(
        new Error("DB connection failed"),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(getRequest(`anonymousId=${ANON_ID}`));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("INTERNAL_ERROR");
    });
  });

  describe("POST", () => {
    let mockTxFindFirst: ReturnType<typeof vi.fn>;
    let mockTxUpdate: ReturnType<typeof vi.fn>;
    let mockTxCreate: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const { prisma } = await import("@/lib/prisma");
      mockTxFindFirst = vi.fn();
      mockTxUpdate = vi.fn();
      mockTxCreate = vi.fn();

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
        return (cb as (tx: unknown) => unknown)({
          cookieConsent: {
            findFirst: mockTxFindFirst,
            update: mockTxUpdate,
            create: mockTxCreate,
          },
        });
      });
    });

    it("returns 429 when rate limited", async () => {
      rateLimitBlocked();

      const response = await POST(
        postRequest({ analyticsConsent: true, marketingConsent: false }),
      );
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.error).toBe("RATE_LIMITED");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("returns 422 for missing required fields", async () => {
      rateLimitOk();

      const response = await POST(postRequest({ analyticsConsent: true }));
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 422 for non-boolean consent values", async () => {
      rateLimitOk();

      const response = await POST(
        postRequest({ analyticsConsent: "yes", marketingConsent: false }),
      );
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 422 for invalid anonymousId format", async () => {
      rateLimitOk();

      const response = await POST(
        postRequest({
          analyticsConsent: true,
          marketingConsent: false,
          anonymousId: "bad-uuid",
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when no user and no anonymousId", async () => {
      rateLimitOk();
      unauthenticated();

      const response = await POST(
        postRequest({ analyticsConsent: true, marketingConsent: false }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("MISSING_IDENTIFIER");
    });

    it("creates new consent for authenticated user with 201", async () => {
      rateLimitOk();
      authenticated();
      mockTxFindFirst.mockResolvedValue(null);
      mockTxCreate.mockResolvedValue(consentRecord());

      const response = await POST(
        postRequest({ analyticsConsent: true, marketingConsent: false }),
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.consent).toEqual({
        id: "consent-1",
        analyticsConsent: true,
        marketingConsent: false,
        consentDate: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      });
      expect(body.data.message).toBe(
        "Preferências de cookies salvas com sucesso",
      );
      expect(mockTxCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          anonymousId: null,
          analyticsConsent: true,
          marketingConsent: false,
        }),
      });
    });

    it("updates existing consent for authenticated user", async () => {
      rateLimitOk();
      authenticated();
      mockTxFindFirst.mockResolvedValue(
        consentRecord({ analyticsConsent: false }),
      );
      mockTxUpdate.mockResolvedValue(consentRecord({ analyticsConsent: true }));

      const response = await POST(
        postRequest({ analyticsConsent: true, marketingConsent: false }),
      );

      expect(response.status).toBe(201);
      expect(mockTxUpdate).toHaveBeenCalledWith({
        where: { id: "consent-1" },
        data: expect.objectContaining({
          analyticsConsent: true,
          marketingConsent: false,
          userId: USER_ID,
        }),
      });
      expect(mockTxCreate).not.toHaveBeenCalled();
    });

    it("links userId when updating previously anonymous consent", async () => {
      rateLimitOk();
      authenticated();
      mockTxFindFirst.mockResolvedValue(
        consentRecord({ userId: null, anonymousId: ANON_ID }),
      );
      mockTxUpdate.mockResolvedValue(
        consentRecord({ userId: USER_ID, anonymousId: ANON_ID }),
      );

      await POST(
        postRequest({
          analyticsConsent: true,
          marketingConsent: false,
          anonymousId: ANON_ID,
        }),
      );

      expect(mockTxUpdate).toHaveBeenCalledWith({
        where: { id: "consent-1" },
        data: expect.objectContaining({ userId: USER_ID }),
      });
    });

    it("creates new consent for anonymous user", async () => {
      rateLimitOk();
      unauthenticated();
      mockTxFindFirst.mockResolvedValue(null);
      mockTxCreate.mockResolvedValue(
        consentRecord({ userId: null, anonymousId: ANON_ID }),
      );

      const response = await POST(
        postRequest({
          analyticsConsent: false,
          marketingConsent: true,
          anonymousId: ANON_ID,
        }),
      );

      expect(response.status).toBe(201);
      expect(mockTxCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          anonymousId: ANON_ID,
          analyticsConsent: false,
          marketingConsent: true,
        }),
      });
    });

    it("updates existing consent for anonymous user", async () => {
      rateLimitOk();
      unauthenticated();
      mockTxFindFirst.mockResolvedValue(
        consentRecord({ userId: null, anonymousId: ANON_ID }),
      );
      mockTxUpdate.mockResolvedValue(
        consentRecord({
          userId: null,
          anonymousId: ANON_ID,
          marketingConsent: true,
        }),
      );

      const response = await POST(
        postRequest({
          analyticsConsent: true,
          marketingConsent: true,
          anonymousId: ANON_ID,
        }),
      );

      expect(response.status).toBe(201);
      expect(mockTxUpdate).toHaveBeenCalled();
      expect(mockTxCreate).not.toHaveBeenCalled();
    });

    it("captures IP address and User-Agent in consent record", async () => {
      rateLimitOk();
      authenticated();
      mockTxFindFirst.mockResolvedValue(null);
      mockTxCreate.mockResolvedValue(consentRecord());

      await POST(
        postRequest({ analyticsConsent: true, marketingConsent: false }),
      );

      expect(mockTxCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: "127.0.0.1",
          userAgent: "TestAgent/1.0",
        }),
      });
    });

    it("uses $transaction for race condition prevention", async () => {
      rateLimitOk();
      authenticated();
      mockTxFindFirst.mockResolvedValue(null);
      mockTxCreate.mockResolvedValue(consentRecord());
      const { prisma } = await import("@/lib/prisma");

      await POST(
        postRequest({ analyticsConsent: true, marketingConsent: false }),
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it("stores null userAgent when header is absent", async () => {
      rateLimitOk();
      authenticated();
      mockTxFindFirst.mockResolvedValue(null);
      mockTxCreate.mockResolvedValue(consentRecord({ userAgent: null }));

      await POST(
        postRequest({ analyticsConsent: true, marketingConsent: false }, ""),
      );

      expect(mockTxCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ userAgent: null }),
      });
    });

    it("delegates to handlePrismaError on database error", async () => {
      rateLimitOk();
      authenticated();
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error("Transaction failed"),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(
        postRequest({ analyticsConsent: true, marketingConsent: false }),
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("INTERNAL_ERROR");
    });
  });
});
