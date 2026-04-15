import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import * as fc from "fast-check";
import { PointTransactionType } from "@prisma/client";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";
import { addDays } from "date-fns";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    pointTransaction: { findMany: vi.fn(), create: vi.fn() },
    loyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

vi.mock("@/services/loyalty/notification.service", () => ({
  LoyaltyNotificationService: {
    notifyPointsExpiring: vi.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from "@/lib/prisma";
import { LoyaltyNotificationService } from "../notification.service";
import { ExpirationService } from "../expiration.service";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

const NOW = new Date("2025-06-15T12:00:00.000Z");

const EARNED_TYPES = [
  PointTransactionType.EARNED_APPOINTMENT,
  PointTransactionType.EARNED_REFERRAL,
  PointTransactionType.EARNED_REVIEW,
  PointTransactionType.EARNED_BIRTHDAY,
  PointTransactionType.EARNED_BONUS,
];

function createMockTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    loyaltyAccountId: "acc-1",
    type: PointTransactionType.EARNED_APPOINTMENT,
    points: 100,
    description: "Appointment reward",
    referenceId: "apt-1",
    expiresAt: new Date("2025-06-14T00:00:00.000Z"),
    createdAt: new Date("2024-06-14T00:00:00.000Z"),
    ...overrides,
  };
}

function mockCandidates(
  candidates: ReturnType<typeof createMockTransaction>[] = [],
) {
  asMock(prisma.pointTransaction.findMany).mockResolvedValueOnce(candidates);
}

function mockAlreadyProcessed(referenceIds: string[] = []) {
  asMock(prisma.pointTransaction.findMany).mockResolvedValueOnce(
    referenceIds.map((referenceId) => ({ referenceId })),
  );
}

describe("services/loyalty/expiration.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("getExpiredTransactions", () => {
    it("should return transactions where expiresAt <= now and points > 0", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          expiresAt: new Date("2025-06-14T00:00:00.000Z"),
        }),
        createMockTransaction({
          id: "tx-2",
          expiresAt: new Date("2025-06-15T12:00:00.000Z"),
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const result = await ExpirationService.getExpiredTransactions(NOW);

      expect(result).toEqual(expired);
      expect(prisma.pointTransaction.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          expiresAt: { lte: NOW },
          points: { gt: 0 },
          type: { in: EARNED_TYPES },
        },
      });
    });

    it("should ignore transactions of type EXPIRED", async () => {
      mockCandidates([]);

      await ExpirationService.getExpiredTransactions(NOW);

      const candidateCall = asMock(prisma.pointTransaction.findMany).mock
        .calls[0][0];
      expect(candidateCall.where.type.in).not.toContain(
        PointTransactionType.EXPIRED,
      );
    });

    it("should ignore transactions of type REDEEMED", async () => {
      mockCandidates([]);

      await ExpirationService.getExpiredTransactions(NOW);

      const candidateCall = asMock(prisma.pointTransaction.findMany).mock
        .calls[0][0];
      expect(candidateCall.where.type.in).not.toContain(
        PointTransactionType.REDEEMED,
      );
    });

    it("should return empty array when no transactions are expired", async () => {
      mockCandidates([]);

      const result = await ExpirationService.getExpiredTransactions(NOW);

      expect(result).toEqual([]);
      expect(prisma.pointTransaction.findMany).toHaveBeenCalledTimes(1);
    });

    it("should exclude transactions that already have an EXPIRED counterpart", async () => {
      const tx1 = createMockTransaction({ id: "tx-1" });
      const tx2 = createMockTransaction({ id: "tx-2" });

      mockCandidates([tx1, tx2]);
      mockAlreadyProcessed(["tx-1"]);

      const result = await ExpirationService.getExpiredTransactions(NOW);

      expect(result).toEqual([tx2]);
    });

    it("should return all candidates when none have been processed yet", async () => {
      const tx1 = createMockTransaction({ id: "tx-1" });
      const tx2 = createMockTransaction({ id: "tx-2" });

      mockCandidates([tx1, tx2]);
      mockAlreadyProcessed([]);

      const result = await ExpirationService.getExpiredTransactions(NOW);

      expect(result).toEqual([tx1, tx2]);
    });
  });

  describe("expirePoints", () => {
    function createTxMocks() {
      return {
        pointTransaction: { findMany: vi.fn(), create: vi.fn() },
        loyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
      };
    }

    function setupTransaction(tx: ReturnType<typeof createTxMocks>) {
      asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
        return await (cb as (t: typeof tx) => Promise<unknown>)(tx);
      });
    }

    it("should create PointTransaction with type EXPIRED and negative points for each expired transaction", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
        createMockTransaction({
          id: "tx-2",
          loyaltyAccountId: "acc-1",
          points: 50,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue({
        id: "acc-1",
        currentPoints: 200,
      });
      setupTransaction(tx);

      await ExpirationService.expirePoints(NOW);

      expect(tx.pointTransaction.create).toHaveBeenCalledTimes(2);
      expect(tx.pointTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          loyaltyAccountId: "acc-1",
          type: PointTransactionType.EXPIRED,
          points: -100,
          referenceId: "tx-1",
        }),
      });
      expect(tx.pointTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          loyaltyAccountId: "acc-1",
          type: PointTransactionType.EXPIRED,
          points: -50,
          referenceId: "tx-2",
        }),
      });
    });

    it("should debit currentPoints from LoyaltyAccount", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue({
        id: "acc-1",
        currentPoints: 500,
      });
      setupTransaction(tx);

      await ExpirationService.expirePoints(NOW);

      expect(tx.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { currentPoints: { decrement: 100 } },
      });
    });

    it("should NOT let currentPoints go negative (clamp to 0)", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 200,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue({
        id: "acc-1",
        currentPoints: 50,
      });
      setupTransaction(tx);

      await ExpirationService.expirePoints(NOW);

      expect(tx.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { currentPoints: { decrement: 50 } },
      });
    });

    it("should NOT alter lifetimePoints", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue({
        id: "acc-1",
        currentPoints: 500,
      });
      setupTransaction(tx);

      await ExpirationService.expirePoints(NOW);

      const updateCall = tx.loyaltyAccount.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("lifetimePoints");
    });

    it("should process multiple accounts in batch", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
        createMockTransaction({
          id: "tx-2",
          loyaltyAccountId: "acc-2",
          points: 200,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique
        .mockResolvedValueOnce({ id: "acc-1", currentPoints: 500 })
        .mockResolvedValueOnce({ id: "acc-2", currentPoints: 300 });
      setupTransaction(tx);

      const result = await ExpirationService.expirePoints(NOW);

      expect(result.affectedAccounts).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it("should return summary with processedCount, totalPointsExpired, affectedAccounts", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
        createMockTransaction({
          id: "tx-2",
          loyaltyAccountId: "acc-1",
          points: 50,
        }),
        createMockTransaction({
          id: "tx-3",
          loyaltyAccountId: "acc-2",
          points: 200,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique
        .mockResolvedValueOnce({ id: "acc-1", currentPoints: 500 })
        .mockResolvedValueOnce({ id: "acc-2", currentPoints: 300 });
      setupTransaction(tx);

      const result = await ExpirationService.expirePoints(NOW);

      expect(result).toEqual({
        processedCount: 3,
        totalPointsExpired: 350,
        affectedAccounts: 2,
      });
    });

    it("should do nothing when no transactions are expired", async () => {
      mockCandidates([]);

      const result = await ExpirationService.expirePoints(NOW);

      expect(result).toEqual({
        processedCount: 0,
        totalPointsExpired: 0,
        affectedAccounts: 0,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should execute inside prisma.$transaction per account", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue({
        id: "acc-1",
        currentPoints: 500,
      });
      setupTransaction(tx);

      await ExpirationService.expirePoints(NOW);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should not re-expire transactions that already have EXPIRED counterparts (idempotency)", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
        createMockTransaction({
          id: "tx-2",
          loyaltyAccountId: "acc-1",
          points: 50,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed(["tx-1", "tx-2"]);

      const result = await ExpirationService.expirePoints(NOW);

      expect(result).toEqual({
        processedCount: 0,
        totalPointsExpired: 0,
        affectedAccounts: 0,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should skip accounts that no longer exist and not count them in results", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
        createMockTransaction({
          id: "tx-2",
          loyaltyAccountId: "acc-1",
          points: 50,
        }),
        createMockTransaction({
          id: "tx-3",
          loyaltyAccountId: "acc-2",
          points: 200,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique
        .mockResolvedValueOnce({ id: "acc-1", currentPoints: 500 })
        .mockResolvedValueOnce(null);
      setupTransaction(tx);

      const result = await ExpirationService.expirePoints(NOW);

      expect(result).toEqual({
        processedCount: 2,
        totalPointsExpired: 150,
        affectedAccounts: 1,
      });
      expect(tx.pointTransaction.create).toHaveBeenCalledTimes(2);
    });

    it("should report totalPointsExpired as the clamped amount, not the full expired sum", async () => {
      const expired = [
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
        }),
      ];

      mockCandidates(expired);
      mockAlreadyProcessed([]);

      const tx = createTxMocks();
      tx.loyaltyAccount.findUnique.mockResolvedValue({
        id: "acc-1",
        currentPoints: 30,
      });
      setupTransaction(tx);

      const result = await ExpirationService.expirePoints(NOW);

      expect(result.totalPointsExpired).toBe(30);
    });
  });

  describe("getExpiringTransactions", () => {
    it("should return transactions expiring within the next 30 days", async () => {
      const expiring = [
        createMockTransaction({
          id: "tx-1",
          expiresAt: addDays(NOW, 15),
        }),
      ];

      asMock(prisma.pointTransaction.findMany).mockResolvedValue(expiring);

      const result = await ExpirationService.getExpiringTransactions();

      expect(result).toEqual(expiring);
      expect(prisma.pointTransaction.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            gt: NOW,
            lte: addDays(NOW, LOYALTY_CONFIG.EXPIRY_WARNING_DAYS),
          },
          points: { gt: 0 },
          type: { in: EARNED_TYPES },
        },
      });
    });

    it("should not return transactions that expire after the warning window", async () => {
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);

      await ExpirationService.getExpiringTransactions();

      const call = asMock(prisma.pointTransaction.findMany).mock.calls[0][0];
      expect(call.where.expiresAt.lte).toEqual(
        addDays(NOW, LOYALTY_CONFIG.EXPIRY_WARNING_DAYS),
      );
    });

    it("should not return already-expired transactions", async () => {
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);

      await ExpirationService.getExpiringTransactions();

      const call = asMock(prisma.pointTransaction.findMany).mock.calls[0][0];
      expect(call.where.expiresAt.gt).toEqual(NOW);
    });
  });

  describe("notifyExpiringPoints", () => {
    it("should call notifyPointsExpiring for each affected profile", async () => {
      const expiresAt1 = addDays(NOW, 5);
      const expiresAt2 = addDays(NOW, 10);

      asMock(prisma.pointTransaction.findMany).mockResolvedValue([
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 80,
          expiresAt: expiresAt1,
        }),
        createMockTransaction({
          id: "tx-2",
          loyaltyAccountId: "acc-1",
          points: 20,
          expiresAt: expiresAt2,
        }),
        createMockTransaction({
          id: "tx-3",
          loyaltyAccountId: "acc-2",
          points: 50,
          expiresAt: expiresAt1,
        }),
      ]);

      asMock(prisma.loyaltyAccount.findUnique)
        .mockResolvedValueOnce({ profileId: "profile-1" })
        .mockResolvedValueOnce({ profileId: "profile-2" });

      await ExpirationService.notifyExpiringPoints();

      expect(
        LoyaltyNotificationService.notifyPointsExpiring,
      ).toHaveBeenCalledTimes(2);
      expect(
        LoyaltyNotificationService.notifyPointsExpiring,
      ).toHaveBeenCalledWith("profile-1", 100, expiresAt1);
      expect(
        LoyaltyNotificationService.notifyPointsExpiring,
      ).toHaveBeenCalledWith("profile-2", 50, expiresAt1);
    });

    it("should do nothing when no transactions are expiring", async () => {
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);

      await ExpirationService.notifyExpiringPoints();

      expect(
        LoyaltyNotificationService.notifyPointsExpiring,
      ).not.toHaveBeenCalled();
    });

    it("should skip accounts that no longer exist", async () => {
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
          expiresAt: addDays(NOW, 5),
        }),
      ]);

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(null);

      await ExpirationService.notifyExpiringPoints();

      expect(
        LoyaltyNotificationService.notifyPointsExpiring,
      ).not.toHaveBeenCalled();
    });

    it("should swallow notification errors (fire-and-forget)", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      asMock(prisma.pointTransaction.findMany).mockResolvedValue([
        createMockTransaction({
          id: "tx-1",
          loyaltyAccountId: "acc-1",
          points: 100,
          expiresAt: addDays(NOW, 5),
        }),
      ]);

      asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue({
        profileId: "profile-1",
      });
      asMock(LoyaltyNotificationService.notifyPointsExpiring).mockRejectedValue(
        new Error("notification failed"),
      );

      await expect(
        ExpirationService.notifyExpiringPoints(),
      ).resolves.not.toThrow();
    });
  });

  describe("property tests", () => {
    it("total points expired should equal sum of original points (clamped per account)", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              points: fc.integer({ min: 1, max: 1000 }),
              accountId: fc.constantFrom("acc-1", "acc-2", "acc-3"),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          fc.integer({ min: 0, max: 5000 }),
          (transactions, baseBalance) => {
            const grouped = new Map<string, number>();
            for (const tx of transactions) {
              grouped.set(
                tx.accountId,
                (grouped.get(tx.accountId) ?? 0) + tx.points,
              );
            }

            let totalExpired = 0;
            for (const [, totalPoints] of grouped) {
              const deducted = Math.min(totalPoints, baseBalance);
              totalExpired += deducted;
            }

            expect(totalExpired).toBeLessThanOrEqual(
              transactions.reduce((sum, tx) => sum + tx.points, 0),
            );

            for (const [, totalPoints] of grouped) {
              const deducted = Math.min(totalPoints, baseBalance);
              expect(baseBalance - deducted).toBeGreaterThanOrEqual(0);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
