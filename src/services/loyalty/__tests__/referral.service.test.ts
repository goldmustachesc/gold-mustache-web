import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import * as fc from "fast-check";
import { PointTransactionType } from "@prisma/client";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";

const mockRecalculateTier = vi.fn();

vi.mock("@/lib/prisma", () => {
  const prisma = {
    loyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    pointTransaction: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: {
    recalculateTier: (...args: unknown[]) => mockRecalculateTier(...args),
  },
}));

vi.mock("@/services/loyalty/notification.service", () => ({
  LoyaltyNotificationService: {
    notifyReferralBonus: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { ReferralService } from "../referral.service";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

function createMockAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: "acc-referrer",
    profileId: "prof-referrer",
    currentPoints: 500,
    lifetimePoints: 1000,
    tier: "BRONZE",
    referralCode: "REF123",
    referredById: null,
    profile: { fullName: "João Silva" },
    ...overrides,
  };
}

function createTxMocks() {
  return {
    pointTransaction: { findFirst: vi.fn(), create: vi.fn() },
    loyaltyAccount: { update: vi.fn() },
  };
}

function setupTransaction(tx: ReturnType<typeof createTxMocks>) {
  asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
    return await (cb as (t: typeof tx) => Promise<unknown>)(tx);
  });
}

describe("services/loyalty/referral.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateReferralCode", () => {
    it("should return LoyaltyAccount with profile when code is valid", async () => {
      const account = createMockAccount();
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(account);

      const result = await ReferralService.validateReferralCode(
        "REF123",
        "acc-other",
      );

      expect(result).toEqual(account);
      expect(prisma.loyaltyAccount.findUnique).toHaveBeenCalledWith({
        where: { referralCode: "REF123" },
        include: { profile: true },
      });
    });

    it("should throw when code does not exist", async () => {
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(null);

      await expect(
        ReferralService.validateReferralCode("NONEXIST", "acc-other"),
      ).rejects.toThrow("Código de indicação não encontrado");
    });

    it("should throw when code belongs to the current user (self-referral)", async () => {
      const account = createMockAccount({ id: "acc-self" });
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(account);

      await expect(
        ReferralService.validateReferralCode("REF123", "acc-self"),
      ).rejects.toThrow("Você não pode usar seu próprio código de indicação");
    });
  });

  describe("applyReferral", () => {
    it("should update referredById on the referred account", async () => {
      const referrer = createMockAccount({ id: "acc-referrer" });
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: null,
      });

      asMock(prisma.loyaltyAccount.findUnique)
        .mockResolvedValueOnce(referrer)
        .mockResolvedValueOnce(referred);
      asMock(prisma.loyaltyAccount.update).mockResolvedValue({
        ...referred,
        referredById: "acc-referrer",
      });

      await ReferralService.applyReferral("acc-referrer", "acc-referred");

      expect(prisma.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-referred" },
        data: { referredById: "acc-referrer" },
      });
    });

    it("should throw when referrer does not exist", async () => {
      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValueOnce(null);

      await expect(
        ReferralService.applyReferral("acc-nonexistent", "acc-referred"),
      ).rejects.toThrow("Conta do indicador não encontrada");
    });

    it("should throw when referred account does not exist", async () => {
      const referrer = createMockAccount({ id: "acc-referrer" });

      asMock(prisma.loyaltyAccount.findUnique)
        .mockResolvedValueOnce(referrer)
        .mockResolvedValueOnce(null);

      await expect(
        ReferralService.applyReferral("acc-referrer", "acc-nonexistent"),
      ).rejects.toThrow("Conta do indicado não encontrada");
    });

    it("should throw when referred already has referredById set", async () => {
      const referrer = createMockAccount({ id: "acc-referrer" });
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: "acc-someone-else",
      });

      asMock(prisma.loyaltyAccount.findUnique)
        .mockResolvedValueOnce(referrer)
        .mockResolvedValueOnce(referred);

      await expect(
        ReferralService.applyReferral("acc-referrer", "acc-referred"),
      ).rejects.toThrow("Esta conta já foi indicada por outro usuário");
    });
  });

  describe("creditReferralBonus", () => {
    it("should credit REFERRAL_BONUS (150 pts) to the referrer inside transaction", async () => {
      const tx = createTxMocks();
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: "acc-referrer",
      });

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(referred);
      tx.pointTransaction.findFirst.mockResolvedValue(null);
      setupTransaction(tx);
      mockRecalculateTier.mockResolvedValue(undefined);

      await ReferralService.creditReferralBonus("acc-referred");

      expect(tx.pointTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          loyaltyAccountId: "acc-referrer",
          type: PointTransactionType.EARNED_REFERRAL,
          points: LOYALTY_CONFIG.REFERRAL_BONUS,
          description: "Bônus por indicação",
          referenceId: "acc-referred",
        }),
      });
      expect(tx.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-referrer" },
        data: {
          currentPoints: { increment: LOYALTY_CONFIG.REFERRAL_BONUS },
          lifetimePoints: { increment: LOYALTY_CONFIG.REFERRAL_BONUS },
        },
      });
    });

    it("should credit FIRST_APPOINTMENT_BONUS (50 pts) to the referred inside transaction", async () => {
      const tx = createTxMocks();
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: "acc-referrer",
      });

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(referred);
      tx.pointTransaction.findFirst.mockResolvedValue(null);
      setupTransaction(tx);
      mockRecalculateTier.mockResolvedValue(undefined);

      await ReferralService.creditReferralBonus("acc-referred");

      expect(tx.pointTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          loyaltyAccountId: "acc-referred",
          type: PointTransactionType.EARNED_REFERRAL,
          points: LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS,
          description: "Bônus de primeiro agendamento por indicação",
          referenceId: "acc-referred",
        }),
      });
      expect(tx.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-referred" },
        data: {
          currentPoints: {
            increment: LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS,
          },
          lifetimePoints: {
            increment: LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS,
          },
        },
      });
    });

    it("should execute guard check and both credits inside a single transaction", async () => {
      const tx = createTxMocks();
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: "acc-referrer",
      });

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(referred);
      tx.pointTransaction.findFirst.mockResolvedValue(null);
      setupTransaction(tx);
      mockRecalculateTier.mockResolvedValue(undefined);

      await ReferralService.creditReferralBonus("acc-referred");

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.pointTransaction.create).toHaveBeenCalledTimes(2);
      expect(tx.loyaltyAccount.update).toHaveBeenCalledTimes(2);
    });

    it("should recalculate tiers for both accounts after transaction", async () => {
      const tx = createTxMocks();
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: "acc-referrer",
      });

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(referred);
      tx.pointTransaction.findFirst.mockResolvedValue(null);
      setupTransaction(tx);
      mockRecalculateTier.mockResolvedValue(undefined);

      await ReferralService.creditReferralBonus("acc-referred");

      expect(mockRecalculateTier).toHaveBeenCalledTimes(2);
      expect(mockRecalculateTier).toHaveBeenCalledWith("acc-referrer");
      expect(mockRecalculateTier).toHaveBeenCalledWith("acc-referred");
    });

    it("should notify referrer after successful referral bonus credit", async () => {
      const tx = createTxMocks();
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: "acc-referrer",
      });

      asMock(prisma.loyaltyAccount.findUnique)
        .mockResolvedValueOnce(referred)
        .mockResolvedValueOnce({ profileId: "prof-referrer" });
      tx.pointTransaction.findFirst.mockResolvedValue(null);
      setupTransaction(tx);
      mockRecalculateTier.mockResolvedValue(undefined);

      await ReferralService.creditReferralBonus("acc-referred");

      const { LoyaltyNotificationService } = await import(
        "../notification.service"
      );
      expect(
        LoyaltyNotificationService.notifyReferralBonus,
      ).toHaveBeenCalledWith("prof-referrer", LOYALTY_CONFIG.REFERRAL_BONUS);
    });

    it("should NOT credit if bonus was already given (double-credit guard)", async () => {
      const tx = createTxMocks();
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: "acc-referrer",
      });

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(referred);
      tx.pointTransaction.findFirst.mockResolvedValue({
        id: "tx-existing",
        type: PointTransactionType.EARNED_REFERRAL,
        referenceId: "acc-referred",
      });
      setupTransaction(tx);

      await ReferralService.creditReferralBonus("acc-referred");

      expect(tx.pointTransaction.create).not.toHaveBeenCalled();
      expect(mockRecalculateTier).not.toHaveBeenCalled();
    });

    it("should NOT credit if account has no referredById", async () => {
      const referred = createMockAccount({
        id: "acc-referred",
        referredById: null,
      });

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(referred);

      await ReferralService.creditReferralBonus("acc-referred");

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(mockRecalculateTier).not.toHaveBeenCalled();
    });
  });

  describe("creditReferralBonus (property test)", () => {
    it("should credit exactly REFERRAL_BONUS + FIRST_APPOINTMENT_BONUS for any valid pair", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (referrerId, referredId) => {
            asMock(prisma.loyaltyAccount.findUnique).mockReset();
            asMock(prisma.$transaction).mockReset();
            mockRecalculateTier.mockClear();

            const tx = createTxMocks();
            const referred = createMockAccount({
              id: referredId,
              referredById: referrerId,
            });

            asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(
              referred,
            );
            tx.pointTransaction.findFirst.mockResolvedValue(null);
            setupTransaction(tx);
            mockRecalculateTier.mockResolvedValue(undefined);

            await ReferralService.creditReferralBonus(referredId);

            expect(tx.pointTransaction.create).toHaveBeenCalledTimes(2);
            const totalPoints = tx.pointTransaction.create.mock.calls.reduce(
              (sum: number, call: unknown[]) =>
                sum + (call[0] as { data: { points: number } }).data.points,
              0,
            );
            expect(totalPoints).toBe(
              LOYALTY_CONFIG.REFERRAL_BONUS +
                LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("getPartialName", () => {
    it("should return first name and last initial", () => {
      expect(ReferralService.getPartialName("João Silva")).toBe("João S.");
    });

    it("should return only first name when there is no last name", () => {
      expect(ReferralService.getPartialName("João")).toBe("João");
    });

    it("should return empty string when name is null", () => {
      expect(ReferralService.getPartialName(null)).toBe("");
    });

    it("should return empty string when name is empty", () => {
      expect(ReferralService.getPartialName("")).toBe("");
    });

    it("should handle names with multiple parts", () => {
      expect(ReferralService.getPartialName("Maria Clara Santos")).toBe(
        "Maria S.",
      );
    });
  });
});
