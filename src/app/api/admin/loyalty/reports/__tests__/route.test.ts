import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loyaltyAccount: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    pointTransaction: {
      aggregate: vi.fn(),
    },
    redemption: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    reward: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

const NOW = new Date("2026-03-01T12:00:00.000Z");

function tierGroupResult(tier: string, count: number) {
  return { tier, _count: { _all: count } };
}

function aggregateResult(field: string, value: number | null) {
  return { _sum: { [field]: value } };
}

function rewardGroupResult(rewardId: string, count: number) {
  return { rewardId, _count: { _all: count } };
}

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

function createGetRequest(): Request {
  return new Request("http://localhost:3001/api/admin/loyalty/reports");
}

function setupDefaultMocks() {
  vi.mocked(prisma.loyaltyAccount.count)
    .mockResolvedValueOnce(142)
    .mockResolvedValueOnce(8);

  vi.mocked(prisma.loyaltyAccount.groupBy).mockResolvedValue([
    tierGroupResult("BRONZE", 98),
    tierGroupResult("SILVER", 30),
    tierGroupResult("GOLD", 11),
    tierGroupResult("DIAMOND", 3),
  ] as never);

  vi.mocked(prisma.loyaltyAccount.aggregate).mockResolvedValue(
    aggregateResult("currentPoints", 45200) as never,
  );

  vi.mocked(prisma.pointTransaction.aggregate)
    .mockResolvedValueOnce(aggregateResult("points", -12800) as never)
    .mockResolvedValueOnce(aggregateResult("points", 8500) as never);

  vi.mocked(prisma.redemption.count)
    .mockResolvedValueOnce(67)
    .mockResolvedValueOnce(48)
    .mockResolvedValueOnce(12)
    .mockResolvedValueOnce(7)
    .mockResolvedValueOnce(15);

  vi.mocked(prisma.redemption.groupBy).mockResolvedValue([
    rewardGroupResult("r1", 23),
    rewardGroupResult("r2", 19),
  ] as never);

  vi.mocked(prisma.reward.findMany).mockResolvedValue([
    { id: "r1", name: "Barba grátis" },
    { id: "r2", name: "Desconto R$10" },
  ] as never);
}

function setupEmptyMocks() {
  vi.mocked(prisma.loyaltyAccount.count).mockResolvedValue(0);
  vi.mocked(prisma.loyaltyAccount.groupBy).mockResolvedValue([] as never);
  vi.mocked(prisma.loyaltyAccount.aggregate).mockResolvedValue(
    aggregateResult("currentPoints", null) as never,
  );
  vi.mocked(prisma.pointTransaction.aggregate).mockResolvedValue(
    aggregateResult("points", null) as never,
  );
  vi.mocked(prisma.redemption.count).mockResolvedValue(0);
  vi.mocked(prisma.redemption.groupBy).mockResolvedValue([] as never);
  vi.mocked(prisma.reward.findMany).mockResolvedValue([] as never);
}

describe("GET /api/admin/loyalty/reports", () => {
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

  it("should return 200 with complete metrics object", async () => {
    adminAuthenticated();
    setupDefaultMocks();

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toBeDefined();
    expect(json.data).toHaveProperty("totalAccounts");
    expect(json.data).toHaveProperty("tierDistribution");
    expect(json.data).toHaveProperty("totalPointsInCirculation");
    expect(json.data).toHaveProperty("totalPointsRedeemed");
    expect(json.data).toHaveProperty("totalRedemptions");
    expect(json.data).toHaveProperty("redemptionsByStatus");
    expect(json.data).toHaveProperty("topRewards");
    expect(json.data).toHaveProperty("recentActivity");
  });

  it("should return totalAccounts as count of LoyaltyAccount", async () => {
    adminAuthenticated();
    setupDefaultMocks();

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data.totalAccounts).toBe(142);
  });

  it("should return tierDistribution with count per tier", async () => {
    adminAuthenticated();
    setupDefaultMocks();

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data.tierDistribution).toEqual({
      BRONZE: 98,
      SILVER: 30,
      GOLD: 11,
      DIAMOND: 3,
    });
  });

  it("should return totalPointsInCirculation as sum of currentPoints", async () => {
    adminAuthenticated();
    setupDefaultMocks();

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data.totalPointsInCirculation).toBe(45200);
  });

  it("should return totalPointsRedeemed as absolute sum of REDEEMED transactions", async () => {
    adminAuthenticated();
    setupDefaultMocks();

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data.totalPointsRedeemed).toBe(12800);
  });

  it("should return redemptionsByStatus with derived counts", async () => {
    adminAuthenticated();
    setupDefaultMocks();

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data.redemptionsByStatus).toEqual({
      PENDING: 12,
      USED: 48,
      EXPIRED: 7,
    });
  });

  it("should return topRewards ordered by count descending", async () => {
    adminAuthenticated();

    vi.mocked(prisma.loyaltyAccount.count).mockResolvedValue(0);
    vi.mocked(prisma.loyaltyAccount.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.loyaltyAccount.aggregate).mockResolvedValue(
      aggregateResult("currentPoints", null) as never,
    );
    vi.mocked(prisma.pointTransaction.aggregate).mockResolvedValue(
      aggregateResult("points", null) as never,
    );
    vi.mocked(prisma.redemption.count).mockResolvedValue(0);

    vi.mocked(prisma.redemption.groupBy).mockResolvedValue([
      rewardGroupResult("r1", 23),
      rewardGroupResult("r2", 19),
      rewardGroupResult("r3", 5),
    ] as never);

    vi.mocked(prisma.reward.findMany).mockResolvedValue([
      { id: "r1", name: "Barba grátis" },
      { id: "r2", name: "Desconto R$10" },
      { id: "r3", name: "Corte grátis" },
    ] as never);

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data.topRewards).toEqual([
      { name: "Barba grátis", count: 23 },
      { name: "Desconto R$10", count: 19 },
      { name: "Corte grátis", count: 5 },
    ]);
  });

  it("should return recentActivity with last 30 days data", async () => {
    adminAuthenticated();
    setupDefaultMocks();

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data.recentActivity).toEqual({
      pointsEarnedLast30Days: 8500,
      redemptionsLast30Days: 15,
      newAccountsLast30Days: 8,
    });
  });

  it("should handle empty database without crash (zeroed values)", async () => {
    adminAuthenticated();
    setupEmptyMocks();

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.totalAccounts).toBe(0);
    expect(json.data.tierDistribution).toEqual({});
    expect(json.data.totalPointsInCirculation).toBe(0);
    expect(json.data.totalPointsRedeemed).toBe(0);
    expect(json.data.totalRedemptions).toBe(0);
    expect(json.data.redemptionsByStatus).toEqual({
      PENDING: 0,
      USED: 0,
      EXPIRED: 0,
    });
    expect(json.data.topRewards).toEqual([]);
    expect(json.data.recentActivity).toEqual({
      pointsEarnedLast30Days: 0,
      redemptionsLast30Days: 0,
      newAccountsLast30Days: 0,
    });
  });
});
