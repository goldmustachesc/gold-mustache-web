import { prisma } from "@/lib/prisma";
import { PointTransactionType, type Prisma } from "@prisma/client";
import { addDays } from "date-fns";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";
import { LoyaltyNotificationService } from "./notification.service";

const EXPIRABLE_TYPES = [
  PointTransactionType.EARNED_APPOINTMENT,
  PointTransactionType.EARNED_REFERRAL,
  PointTransactionType.EARNED_REVIEW,
  PointTransactionType.EARNED_BIRTHDAY,
  PointTransactionType.EARNED_BONUS,
];

export interface ExpirePointsResult {
  processedCount: number;
  totalPointsExpired: number;
  affectedAccounts: number;
}

async function getExpiredTransactions(date: Date = new Date()) {
  const candidates = await prisma.pointTransaction.findMany({
    where: {
      expiresAt: { lte: date },
      points: { gt: 0 },
      type: { in: EXPIRABLE_TYPES },
    },
  });

  if (candidates.length === 0) return [];

  const alreadyProcessed = await prisma.pointTransaction.findMany({
    where: {
      type: PointTransactionType.EXPIRED,
      referenceId: { in: candidates.map((c) => c.id) },
    },
    select: { referenceId: true },
  });

  const processedIds = new Set(
    alreadyProcessed
      .map((t) => t.referenceId)
      .filter((id): id is string => id !== null),
  );

  return candidates.filter((c) => !processedIds.has(c.id));
}

async function expirePoints(
  date: Date = new Date(),
): Promise<ExpirePointsResult> {
  const expired = await getExpiredTransactions(date);

  if (expired.length === 0) {
    return { processedCount: 0, totalPointsExpired: 0, affectedAccounts: 0 };
  }

  const grouped = new Map<string, Array<{ id: string; points: number }>>();

  for (const tx of expired) {
    const list = grouped.get(tx.loyaltyAccountId) ?? [];
    list.push({ id: tx.id, points: tx.points });
    grouped.set(tx.loyaltyAccountId, list);
  }

  let totalPointsExpired = 0;
  let processedCount = 0;
  let affectedAccounts = 0;

  for (const [accountId, transactions] of grouped) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const account = await tx.loyaltyAccount.findUnique({
        where: { id: accountId },
        select: { currentPoints: true },
      });

      if (!account) return;

      const sumExpired = transactions.reduce((s, t) => s + t.points, 0);
      const deductible = Math.min(sumExpired, account.currentPoints);

      for (const transaction of transactions) {
        await tx.pointTransaction.create({
          data: {
            loyaltyAccountId: accountId,
            type: PointTransactionType.EXPIRED,
            points: -transaction.points,
            description: `Expiração automática de ${transaction.points} pontos`,
            referenceId: transaction.id,
          },
        });
      }

      await tx.loyaltyAccount.update({
        where: { id: accountId },
        data: { currentPoints: { decrement: deductible } },
      });

      processedCount += transactions.length;
      affectedAccounts += 1;
      totalPointsExpired += deductible;
    });
  }

  return { processedCount, totalPointsExpired, affectedAccounts };
}

async function getExpiringTransactions(
  warningDays: number = LOYALTY_CONFIG.EXPIRY_WARNING_DAYS,
) {
  const now = new Date();
  return prisma.pointTransaction.findMany({
    where: {
      expiresAt: {
        gt: now,
        lte: addDays(now, warningDays),
      },
      points: { gt: 0 },
      type: { in: EXPIRABLE_TYPES },
    },
  });
}

async function notifyExpiringPoints(warningDays?: number): Promise<void> {
  const transactions = await getExpiringTransactions(warningDays);

  if (transactions.length === 0) return;

  const grouped = new Map<
    string,
    { totalPoints: number; earliestExpiresAt: Date }
  >();

  for (const tx of transactions) {
    const existing = grouped.get(tx.loyaltyAccountId);
    if (existing) {
      existing.totalPoints += tx.points;
      if (tx.expiresAt && tx.expiresAt < existing.earliestExpiresAt) {
        existing.earliestExpiresAt = tx.expiresAt;
      }
    } else {
      grouped.set(tx.loyaltyAccountId, {
        totalPoints: tx.points,
        earliestExpiresAt: tx.expiresAt ?? new Date(),
      });
    }
  }

  for (const [accountId, { totalPoints, earliestExpiresAt }] of grouped) {
    try {
      const account = await prisma.loyaltyAccount.findUnique({
        where: { id: accountId },
        select: { profileId: true },
      });

      if (!account) continue;

      await LoyaltyNotificationService.notifyPointsExpiring(
        account.profileId,
        totalPoints,
        earliestExpiresAt,
      );
    } catch (error) {
      console.error(
        `[ExpirationService] Failed to notify account ${accountId}:`,
        error,
      );
    }
  }
}

export const ExpirationService = {
  getExpiredTransactions,
  expirePoints,
  getExpiringTransactions,
  notifyExpiringPoints,
};
