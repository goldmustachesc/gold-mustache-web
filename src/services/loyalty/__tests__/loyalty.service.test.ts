import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { LoyaltyTier, PointTransactionType } from "@prisma/client";

// Mock do prisma
vi.mock("@/lib/prisma", () => {
  const prisma = {
    loyaltyAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma };
});

vi.mock("../notification.service", () => ({
  LoyaltyNotificationService: {
    notifyTierUpgrade: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { LoyaltyService } from "../loyalty.service";
import * as pointsCalculator from "../points.calculator";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

describe("services/loyalty.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("getOrCreateAccount", () => {
    it("should return existing account if found", async () => {
      const mockAccount = {
        id: "acc-1",
        profileId: "prof-1",
        tier: LoyaltyTier.BRONZE,
        currentPoints: 0,
        lifetimePoints: 0,
        referralCode: "ABCDEF",
      };

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(mockAccount);

      const result = await LoyaltyService.getOrCreateAccount("prof-1");

      expect(prisma.loyaltyAccount.findUnique).toHaveBeenCalledWith({
        where: { profileId: "prof-1" },
      });
      expect(result).toEqual(mockAccount);
      expect(prisma.loyaltyAccount.create).not.toHaveBeenCalled();
    });

    it("should create new account if tracking profile has none", async () => {
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(null);

      const newMockAccount = {
        id: "acc-2",
        profileId: "prof-2",
        tier: LoyaltyTier.BRONZE,
        currentPoints: 0,
        lifetimePoints: 0,
        referralCode: "NEWCOD",
      };

      asMock(prisma.loyaltyAccount.create).mockResolvedValue(newMockAccount);

      const result = await LoyaltyService.getOrCreateAccount("prof-2");

      expect(prisma.loyaltyAccount.create).toHaveBeenCalled();
      expect(result).toEqual(newMockAccount);
    });
  });

  describe("recalculateTier", () => {
    it("should return early if account is not found", async () => {
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(null);
      await LoyaltyService.recalculateTier("acc-missing");
      expect(prisma.loyaltyAccount.update).not.toHaveBeenCalled();
    });

    it("should not update tier if user still under threshold", async () => {
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue({
        lifetimePoints: 100,
        tier: LoyaltyTier.BRONZE,
      });

      // pointsCalculator returns BRONZE for 100 points
      vi.spyOn(pointsCalculator, "determineTier").mockReturnValue(
        LoyaltyTier.BRONZE,
      );

      await LoyaltyService.recalculateTier("acc-1");
      expect(prisma.loyaltyAccount.update).not.toHaveBeenCalled();
    });

    it("should update tier if lifetime points hit a new threshold", async () => {
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue({
        lifetimePoints: 1000,
        tier: LoyaltyTier.BRONZE,
      });

      vi.spyOn(pointsCalculator, "determineTier").mockReturnValue(
        LoyaltyTier.SILVER,
      );

      await LoyaltyService.recalculateTier("acc-upgraded");

      expect(prisma.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-upgraded" },
        data: { tier: LoyaltyTier.SILVER },
      });

      const { LoyaltyNotificationService } = await import(
        "../notification.service"
      );
      expect(LoyaltyNotificationService.notifyTierUpgrade).toHaveBeenCalledWith(
        "acc-upgraded",
        LoyaltyTier.SILVER,
        LoyaltyTier.BRONZE,
      );
    });
  });

  describe("creditPoints", () => {
    it("should return early if points is <= 0", async () => {
      await LoyaltyService.creditPoints({
        accountId: "acc-1",
        type: PointTransactionType.EARNED_APPOINTMENT,
        points: 0,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should process point addition inside transaction and call tier recalc", async () => {
      vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));

      asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
        const callback = cb as (tx: unknown) => Promise<unknown>;
        const tx = {
          pointTransaction: { create: vi.fn() },
          loyaltyAccount: { update: vi.fn() },
        };
        return await callback(tx);
      });

      // Prevent recalculateTier from throwing or updating fake DB
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(null);

      await LoyaltyService.creditPoints({
        accountId: "acc-credit-1",
        type: PointTransactionType.EARNED_APPOINTMENT,
        points: 100,
        description: "Test reward",
        referenceId: "apt-1",
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("debitPoints", () => {
    it("should return early if points is <= 0", async () => {
      await LoyaltyService.debitPoints({
        accountId: "acc-1",
        type: PointTransactionType.REDEEMED,
        points: -5, // Test negative input handling
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should throw if user lacks currentPoints on debit", async () => {
      asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
        const callback = cb as (tx: unknown) => Promise<unknown>;
        const tx = {
          loyaltyAccount: {
            findUnique: vi.fn().mockResolvedValue({ currentPoints: 50 }),
          },
        };
        return await callback(tx);
      });

      await expect(
        LoyaltyService.debitPoints({
          accountId: "acc-poor",
          type: PointTransactionType.REDEEMED,
          points: 100,
        }),
      ).rejects.toThrow("Saldo de pontos insuficiente.");
    });

    it("should process point debit gracefully inside transaction", async () => {
      asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
        const callback = cb as (tx: unknown) => Promise<unknown>;
        const tx = {
          loyaltyAccount: {
            findUnique: vi.fn().mockResolvedValue({ currentPoints: 100 }),
            update: vi.fn(),
          },
          pointTransaction: { create: vi.fn() },
        };
        return await callback(tx);
      });

      await LoyaltyService.debitPoints({
        accountId: "acc-rich",
        type: PointTransactionType.REDEEMED,
        points: 50,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
