import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import * as fc from "fast-check";
import { PointTransactionType } from "@prisma/client";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";
import { addDays } from "date-fns";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    redemption: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    reward: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    pointTransaction: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

vi.mock("../notification.service", () => ({
  LoyaltyNotificationService: {
    notifyRewardRedeemed: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { RewardsService } from "../rewards.service";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

const NOW = new Date("2025-06-15T12:00:00.000Z");

function createMockAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: "acc-1",
    profileId: "prof-1",
    currentPoints: 500,
    lifetimePoints: 1000,
    tier: "BRONZE",
    referralCode: "ABCDEF",
    ...overrides,
  };
}

function createMockReward(overrides: Record<string, unknown> = {}) {
  return {
    id: "reward-1",
    name: "Corte Grátis",
    description: "Um corte de cabelo gratuito",
    pointsCost: 200,
    type: "FREE_SERVICE",
    active: true,
    stock: 5,
    value: null,
    serviceId: null,
    imageUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createMockRedemption(overrides: Record<string, unknown> = {}) {
  return {
    id: "redemption-1",
    loyaltyAccountId: "acc-1",
    rewardId: "reward-1",
    pointsSpent: 200,
    code: "ABC123",
    usedAt: null,
    expiresAt: addDays(NOW, LOYALTY_CONFIG.REDEMPTION_VALIDITY_DAYS),
    createdAt: NOW,
    ...overrides,
  };
}

function createTxMocks() {
  return {
    loyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    reward: { findUnique: vi.fn(), update: vi.fn() },
    redemption: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    pointTransaction: { create: vi.fn() },
  };
}

function setupTransaction(tx: ReturnType<typeof createTxMocks>) {
  asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
    return await (cb as (t: typeof tx) => Promise<unknown>)(tx);
  });
}

describe("services/loyalty/rewards.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("generateRedemptionCode", () => {
    it("should generate a 6-character uppercase alphanumeric string", () => {
      const code = RewardsService.generateRedemptionCode();

      expect(code).toHaveLength(LOYALTY_CONFIG.REDEMPTION_CODE_LENGTH);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it("should generate different codes on consecutive calls (property test)", () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const code1 = RewardsService.generateRedemptionCode();
          const code2 = RewardsService.generateRedemptionCode();
          expect(code1).not.toBe(code2);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("redeemReward", () => {
    it("should redeem successfully when balance is sufficient and reward is active", async () => {
      const tx = createTxMocks();
      const account = createMockAccount();
      const reward = createMockReward();
      const redemption = createMockRedemption();

      tx.loyaltyAccount.findUnique.mockResolvedValue(account);
      tx.reward.findUnique.mockResolvedValue(reward);
      tx.redemption.create.mockResolvedValue(redemption);
      setupTransaction(tx);

      const result = await RewardsService.redeemReward("acc-1", "reward-1");

      expect(result).toEqual(redemption);
      expect(tx.redemption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          loyaltyAccountId: "acc-1",
          rewardId: "reward-1",
          pointsSpent: 200,
          code: expect.stringMatching(/^[A-Z0-9]{6}$/),
          expiresAt: addDays(NOW, LOYALTY_CONFIG.REDEMPTION_VALIDITY_DAYS),
        }),
      });

      const { LoyaltyNotificationService } = await import(
        "../notification.service"
      );
      expect(
        LoyaltyNotificationService.notifyRewardRedeemed,
      ).toHaveBeenCalledWith("acc-1", "Corte Grátis", "ABC123");
    });

    it("should throw when account is not found", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(null);
      setupTransaction(tx);

      await expect(
        RewardsService.redeemReward("acc-missing", "reward-1"),
      ).rejects.toThrow("Conta de fidelidade não encontrada");
    });

    it("should throw when reward is not found", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(null);
      setupTransaction(tx);

      await expect(
        RewardsService.redeemReward("acc-1", "reward-missing"),
      ).rejects.toThrow("Recompensa não encontrada");
    });

    it("should throw when balance is insufficient", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(
        createMockAccount({ currentPoints: 50 }),
      );
      tx.reward.findUnique.mockResolvedValue(
        createMockReward({ pointsCost: 200 }),
      );
      setupTransaction(tx);

      await expect(
        RewardsService.redeemReward("acc-1", "reward-1"),
      ).rejects.toThrow("Saldo de pontos insuficiente");
    });

    it("should throw when reward is inactive", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(
        createMockReward({ active: false }),
      );
      setupTransaction(tx);

      await expect(
        RewardsService.redeemReward("acc-1", "reward-1"),
      ).rejects.toThrow("Recompensa não está ativa");
    });

    it("should throw when reward is out of stock", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(createMockReward({ stock: 0 }));
      setupTransaction(tx);

      await expect(
        RewardsService.redeemReward("acc-1", "reward-1"),
      ).rejects.toThrow("Recompensa sem estoque");
    });

    it("should decrement stock when stock is not null", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(createMockReward({ stock: 5 }));
      tx.redemption.create.mockResolvedValue(createMockRedemption());
      setupTransaction(tx);

      await RewardsService.redeemReward("acc-1", "reward-1");

      expect(tx.reward.update).toHaveBeenCalledWith({
        where: { id: "reward-1" },
        data: { stock: { decrement: 1 } },
      });
    });

    it("should NOT decrement stock when stock is null (unlimited)", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(createMockReward({ stock: null }));
      tx.redemption.create.mockResolvedValue(createMockRedemption());
      setupTransaction(tx);

      await RewardsService.redeemReward("acc-1", "reward-1");

      expect(tx.reward.update).not.toHaveBeenCalled();
    });

    it("should create redemption with correct expiresAt", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(createMockReward());
      tx.redemption.create.mockResolvedValue(createMockRedemption());
      setupTransaction(tx);

      await RewardsService.redeemReward("acc-1", "reward-1");

      expect(tx.redemption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: addDays(NOW, LOYALTY_CONFIG.REDEMPTION_VALIDITY_DAYS),
        }),
      });
    });

    it("should debit points with correct amount", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(
        createMockReward({ pointsCost: 300 }),
      );
      tx.redemption.create.mockResolvedValue(
        createMockRedemption({ pointsSpent: 300 }),
      );
      setupTransaction(tx);

      await RewardsService.redeemReward("acc-1", "reward-1");

      expect(tx.pointTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          loyaltyAccountId: "acc-1",
          type: PointTransactionType.REDEEMED,
          points: -300,
        }),
      });
      expect(tx.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { currentPoints: { decrement: 300 } },
      });
    });

    it("should execute all operations inside prisma.$transaction", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(createMockReward());
      tx.redemption.create.mockResolvedValue(createMockRedemption());
      setupTransaction(tx);

      await RewardsService.redeemReward("acc-1", "reward-1");

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should retry when generated code already exists (P2002 collision)", async () => {
      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue(createMockAccount());
      tx.reward.findUnique.mockResolvedValue(createMockReward());
      tx.redemption.create
        .mockRejectedValueOnce(
          Object.assign(new Error("Unique constraint"), { code: "P2002" }),
        )
        .mockResolvedValueOnce(createMockRedemption());
      setupTransaction(tx);

      const result = await RewardsService.redeemReward("acc-1", "reward-1");

      expect(result).toBeDefined();
      expect(tx.redemption.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("validateRedemptionCode", () => {
    it("should return redemption with reward when code is valid and pending", async () => {
      const redemption = createMockRedemption({
        reward: createMockReward(),
        loyaltyAccount: { profile: { fullName: "John Doe" } },
      });

      asMock(prisma.redemption.findUnique).mockResolvedValue(redemption);

      const result = await RewardsService.validateRedemptionCode("ABC123");

      expect(result).toEqual(redemption);
      expect(prisma.redemption.findUnique).toHaveBeenCalledWith({
        where: { code: "ABC123" },
        include: {
          reward: true,
          loyaltyAccount: { include: { profile: true } },
        },
      });
    });

    it("should throw when code is not found", async () => {
      asMock(prisma.redemption.findUnique).mockResolvedValue(null);

      await expect(
        RewardsService.validateRedemptionCode("NONEXIST"),
      ).rejects.toThrow("Código de resgate não encontrado");
    });

    it("should throw when code has already been used", async () => {
      asMock(prisma.redemption.findUnique).mockResolvedValue(
        createMockRedemption({
          usedAt: new Date("2025-06-10T00:00:00.000Z"),
          reward: createMockReward(),
        }),
      );

      await expect(
        RewardsService.validateRedemptionCode("ABC123"),
      ).rejects.toThrow("Código de resgate já foi utilizado");
    });

    it("should throw when code is expired", async () => {
      asMock(prisma.redemption.findUnique).mockResolvedValue(
        createMockRedemption({
          expiresAt: new Date("2025-06-14T00:00:00.000Z"),
          reward: createMockReward(),
        }),
      );

      await expect(
        RewardsService.validateRedemptionCode("ABC123"),
      ).rejects.toThrow("Código de resgate expirado");
    });
  });

  describe("markRedemptionAsUsed", () => {
    it("should set usedAt to current date", async () => {
      const updated = createMockRedemption({ usedAt: NOW });

      asMock(prisma.redemption.updateMany).mockResolvedValue({ count: 1 });
      asMock(prisma.redemption.findUnique).mockResolvedValue(updated);

      const result = await RewardsService.markRedemptionAsUsed("ABC123");

      expect(result.usedAt).toEqual(NOW);
      expect(prisma.redemption.updateMany).toHaveBeenCalledWith({
        where: { code: "ABC123", usedAt: null },
        data: { usedAt: NOW },
      });
    });

    it("should throw when code has already been used (double-use guard)", async () => {
      asMock(prisma.redemption.updateMany).mockResolvedValue({ count: 0 });
      asMock(prisma.redemption.findUnique).mockResolvedValue(
        createMockRedemption({ usedAt: new Date("2025-06-10T00:00:00.000Z") }),
      );

      await expect(
        RewardsService.markRedemptionAsUsed("ABC123"),
      ).rejects.toThrow("Código de resgate já foi utilizado");
    });

    it("should throw when code is not found", async () => {
      asMock(prisma.redemption.updateMany).mockResolvedValue({ count: 0 });
      asMock(prisma.redemption.findUnique).mockResolvedValue(null);

      await expect(
        RewardsService.markRedemptionAsUsed("NONEXIST"),
      ).rejects.toThrow("Código de resgate não encontrado");
    });
  });
});
