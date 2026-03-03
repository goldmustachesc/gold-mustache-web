import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    redemption: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "../route";

const NOW = new Date("2026-03-01T12:00:00.000Z");

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
    response: new Response(
      JSON.stringify({ error: "UNAUTHORIZED", message: "Não autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  } as RequireAdminResult);
}

function createGetRequest(params = ""): Request {
  return new Request(
    `http://localhost:3001/api/admin/loyalty/redemptions${params ? `?${params}` : ""}`,
  );
}

const mockRedemption = (overrides = {}) => ({
  id: "red-1",
  code: "ABC123",
  pointsSpent: 500,
  usedAt: null,
  expiresAt: new Date("2026-04-01T00:00:00.000Z"),
  createdAt: new Date("2026-02-20T10:00:00.000Z"),
  loyaltyAccountId: "acc-1",
  rewardId: "reward-1",
  reward: { name: "Corte Grátis", type: "FREE_SERVICE", value: null },
  loyaltyAccount: {
    profile: { fullName: "John Doe", email: "john@example.com" },
  },
  ...overrides,
});

describe("GET /api/admin/loyalty/redemptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should return 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(401);
  });

  it("should return 200 with paginated list of all redemptions", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    const redemptions = [
      mockRedemption(),
      mockRedemption({
        id: "red-2",
        code: "DEF456",
        usedAt: new Date("2026-02-25T14:00:00.000Z"),
        reward: { name: "Desconto 20%", type: "DISCOUNT", value: 20 },
        loyaltyAccount: {
          profile: { fullName: "Jane Smith", email: "jane@example.com" },
        },
      }),
    ];

    vi.mocked(prisma.redemption.findMany).mockResolvedValue(redemptions);
    vi.mocked(prisma.redemption.count).mockResolvedValue(2);

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
  });

  it("should include client name, email and reward data in each item", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.redemption.findMany).mockResolvedValue([mockRedemption()]);
    vi.mocked(prisma.redemption.count).mockResolvedValue(1);

    const response = await GET(createGetRequest());
    const json = await response.json();

    const item = json.data[0];
    expect(item.clientName).toBe("John Doe");
    expect(item.clientEmail).toBe("john@example.com");
    expect(item.rewardName).toBe("Corte Grátis");
    expect(item.rewardType).toBe("FREE_SERVICE");
    expect(item.code).toBe("ABC123");
    expect(item.status).toBe("PENDING");
  });

  it("should filter by status=PENDING", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.redemption.findMany).mockResolvedValue([mockRedemption()]);
    vi.mocked(prisma.redemption.count).mockResolvedValue(1);

    const response = await GET(createGetRequest("status=PENDING"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);

    const whereArg = vi.mocked(prisma.redemption.findMany).mock.calls[0][0]
      ?.where;
    expect(whereArg).toMatchObject({ usedAt: null });
    expect(whereArg?.expiresAt).toHaveProperty("gte");
  });

  it("should filter by status=USED", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    const usedRedemption = mockRedemption({
      usedAt: new Date("2026-02-28T10:00:00.000Z"),
    });
    vi.mocked(prisma.redemption.findMany).mockResolvedValue([usedRedemption]);
    vi.mocked(prisma.redemption.count).mockResolvedValue(1);

    await GET(createGetRequest("status=USED"));

    const whereArg = vi.mocked(prisma.redemption.findMany).mock.calls[0][0]
      ?.where;
    expect(whereArg?.usedAt).toEqual({ not: null });
  });

  it("should filter by status=EXPIRED", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.redemption.findMany).mockResolvedValue([]);
    vi.mocked(prisma.redemption.count).mockResolvedValue(0);

    await GET(createGetRequest("status=EXPIRED"));

    const whereArg = vi.mocked(prisma.redemption.findMany).mock.calls[0][0]
      ?.where;
    expect(whereArg).toMatchObject({ usedAt: null });
    expect(whereArg?.expiresAt).toHaveProperty("lt");
  });

  it("should return empty array with meta when no redemptions exist", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.redemption.findMany).mockResolvedValue([]);
    vi.mocked(prisma.redemption.count).mockResolvedValue(0);

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
    expect(json.meta).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it("should respect page and limit query params", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.redemption.findMany).mockResolvedValue([]);
    vi.mocked(prisma.redemption.count).mockResolvedValue(50);

    const response = await GET(createGetRequest("page=2&limit=10"));
    const json = await response.json();

    expect(json.meta).toEqual({
      total: 50,
      page: 2,
      limit: 10,
      totalPages: 5,
    });

    const findManyArgs = vi.mocked(prisma.redemption.findMany).mock.calls[0][0];
    expect(findManyArgs?.skip).toBe(10);
    expect(findManyArgs?.take).toBe(10);
  });

  it("should return single redemption when code query param is present", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.redemption.findUnique).mockResolvedValue(mockRedemption());

    const response = await GET(createGetRequest("code=ABC123"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.code).toBe("ABC123");
    expect(json.data.clientName).toBe("John Doe");
    expect(json.data.status).toBe("PENDING");
    expect(prisma.redemption.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "ABC123" } }),
    );
  });

  it("should return 400 when status param is invalid", async () => {
    adminAuthenticated();

    const response = await GET(createGetRequest("status=INVALID"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("should return 404 when code is not found", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.redemption.findUnique).mockResolvedValue(null);

    const response = await GET(createGetRequest("code=NOTFND"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });
});
