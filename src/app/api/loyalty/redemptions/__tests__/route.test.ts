import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { addDays } from "date-fns";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

const mockRedeemReward = vi.fn();

vi.mock("@/services/loyalty/rewards.service", () => ({
  RewardsService: {
    redeemReward: (...args: unknown[]) => mockRedeemReward(...args),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    loyaltyAccount: { findUnique: vi.fn(), create: vi.fn() },
    redemption: { findMany: vi.fn(), count: vi.fn() },
    reward: { findUnique: vi.fn() },
  },
}));

vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: {
    getOrCreateAccount: vi.fn(),
  },
}));

import { POST, GET } from "../route";
import { prisma } from "@/lib/prisma";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";

const NOW = new Date("2026-03-01T12:00:00.000Z");

function authenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
}

function unauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
  });
}

function mockProfile(profileId = "profile-1") {
  vi.mocked(prisma.profile.findUnique).mockResolvedValue({
    id: profileId,
  } as never);
}

function mockAccount(accountId = "acc-1") {
  vi.mocked(LoyaltyService.getOrCreateAccount).mockResolvedValue({
    id: accountId,
    profileId: "profile-1",
    currentPoints: 500,
    lifetimePoints: 1000,
    tier: "BRONZE",
    referralCode: "ABCDEF",
    tierUpdatedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  } as never);
}

function createRequest(body: unknown): Request {
  return { json: async () => body } as Request;
}

function createGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3001/api/loyalty/redemptions");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return { url: url.toString() } as Request;
}

describe("/api/loyalty/redemptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("POST", () => {
    it("should return 401 when not authenticated", async () => {
      unauthenticatedUser();

      const response = await POST(createRequest({ rewardId: "reward-1" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("UNAUTHORIZED");
    });

    it("should return 400 when body is invalid (missing rewardId)", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when rewardId is not a valid UUID", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      const response = await POST(createRequest({ rewardId: "not-a-uuid" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 201 with redemption data on success", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      const redemption = {
        id: "redemption-1",
        code: "ABC123",
        pointsSpent: 200,
        expiresAt: addDays(NOW, LOYALTY_CONFIG.REDEMPTION_VALIDITY_DAYS),
        createdAt: NOW,
        loyaltyAccountId: "acc-1",
        rewardId: "reward-uuid-1234-5678-abcdefabcdef",
        usedAt: null,
      };

      mockRedeemReward.mockResolvedValue(redemption);

      vi.mocked(prisma.reward.findUnique).mockResolvedValue({
        name: "Corte Grátis",
        type: "FREE_SERVICE",
      } as never);

      const response = await POST(
        createRequest({
          rewardId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toMatchObject({
        id: "redemption-1",
        code: "ABC123",
        pointsSpent: 200,
        reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
      });
      expect(data.data.expiresAt).toBeDefined();
    });

    it("should return 400 when balance is insufficient", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      mockRedeemReward.mockRejectedValue(
        new Error("Saldo de pontos insuficiente."),
      );

      const response = await POST(
        createRequest({
          rewardId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("insuficiente");
    });

    it("should return 404 when reward does not exist", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      mockRedeemReward.mockRejectedValue(
        new Error("Recompensa não encontrada."),
      );

      const response = await POST(
        createRequest({
          rewardId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        }),
      );

      expect(response.status).toBe(404);
    });

    it("should call RewardsService.redeemReward with correct accountId and rewardId", async () => {
      authenticatedUser();
      mockProfile("profile-1");
      mockAccount("acc-1");

      const redemption = {
        id: "redemption-1",
        code: "XYZ789",
        pointsSpent: 200,
        expiresAt: addDays(NOW, LOYALTY_CONFIG.REDEMPTION_VALIDITY_DAYS),
        createdAt: NOW,
        loyaltyAccountId: "acc-1",
        rewardId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        usedAt: null,
      };

      mockRedeemReward.mockResolvedValue(redemption);
      vi.mocked(prisma.reward.findUnique).mockResolvedValue({
        name: "Barba Grátis",
        type: "FREE_SERVICE",
      } as never);

      await POST(
        createRequest({
          rewardId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        }),
      );

      expect(mockRedeemReward).toHaveBeenCalledWith(
        "acc-1",
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      );
    });
  });

  describe("GET", () => {
    it("should return 401 when not authenticated", async () => {
      unauthenticatedUser();

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("UNAUTHORIZED");
    });

    it("should return 200 with paginated list of redemptions", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      const redemptions = [
        {
          id: "r-1",
          code: "AAA111",
          pointsSpent: 200,
          usedAt: null,
          expiresAt: addDays(NOW, 30),
          createdAt: NOW,
          reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
        },
      ];

      vi.mocked(prisma.redemption.findMany).mockResolvedValue(
        redemptions as never,
      );
      vi.mocked(prisma.redemption.count).mockResolvedValue(1);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.meta).toMatchObject({
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });

    it("should include reward name, type and derived status in each item", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      const redemptions = [
        {
          id: "r-1",
          code: "AAA111",
          pointsSpent: 200,
          usedAt: null,
          expiresAt: addDays(NOW, 30),
          createdAt: NOW,
          reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
        },
      ];

      vi.mocked(prisma.redemption.findMany).mockResolvedValue(
        redemptions as never,
      );
      vi.mocked(prisma.redemption.count).mockResolvedValue(1);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(data.data[0]).toMatchObject({
        reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
        status: "PENDING",
      });
    });

    it("should derive status USED when usedAt is set", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      vi.mocked(prisma.redemption.findMany).mockResolvedValue([
        {
          id: "r-1",
          code: "AAA111",
          pointsSpent: 200,
          usedAt: new Date("2026-02-15T10:00:00.000Z"),
          expiresAt: addDays(NOW, 30),
          createdAt: NOW,
          reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
        },
      ] as never);
      vi.mocked(prisma.redemption.count).mockResolvedValue(1);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(data.data[0].status).toBe("USED");
    });

    it("should derive status EXPIRED when expiresAt is in the past", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      vi.mocked(prisma.redemption.findMany).mockResolvedValue([
        {
          id: "r-1",
          code: "AAA111",
          pointsSpent: 200,
          usedAt: null,
          expiresAt: new Date("2026-02-01T00:00:00.000Z"),
          createdAt: NOW,
          reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
        },
      ] as never);
      vi.mocked(prisma.redemption.count).mockResolvedValue(1);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(data.data[0].status).toBe("EXPIRED");
    });

    it("should respect pagination params", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      vi.mocked(prisma.redemption.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.redemption.count).mockResolvedValue(25);

      const response = await GET(createGetRequest({ page: "2", limit: "10" }));
      const data = await response.json();

      expect(data.meta).toMatchObject({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });

      expect(prisma.redemption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it("should return empty list when no redemptions exist", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      vi.mocked(prisma.redemption.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.redemption.count).mockResolvedValue(0);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.meta.total).toBe(0);
    });
  });
});
