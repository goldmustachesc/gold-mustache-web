import { prisma } from "@/lib/prisma";
import type {
  LoyaltyAccount,
  PointTransactionType,
  Prisma,
} from "@prisma/client";
import { determineTier } from "./points.calculator";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";
import { addMonths } from "date-fns";
import crypto from "crypto";

/**
 * Generates a unique 6-character referral code
 */
function generateReferralCode(): string {
  return crypto
    .randomBytes(4)
    .toString("hex")
    .slice(0, LOYALTY_CONFIG.REDEMPTION_CODE_LENGTH)
    .toUpperCase();
}

/**
 * Creates a loyalty account for an existing profile
 */
async function createAccount(profileId: string): Promise<LoyaltyAccount> {
  return prisma.loyaltyAccount.create({
    data: {
      profileId,
      referralCode: generateReferralCode(),
    },
  });
}

/**
 * Gets a loyalty account by profile ID, creating it if it doesn't exist
 */
async function getOrCreateAccount(profileId: string): Promise<LoyaltyAccount> {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { profileId },
  });

  if (account) return account;

  return createAccount(profileId);
}

/**
 * Recalculates tier based on lifetime points
 */
async function recalculateTier(accountId: string): Promise<void> {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { id: accountId },
    select: { lifetimePoints: true, tier: true },
  });

  if (!account) return;

  const newTier = determineTier(account.lifetimePoints);

  if (newTier !== account.tier) {
    await prisma.loyaltyAccount.update({
      where: { id: accountId },
      data: { tier: newTier },
    });

    // TODO: Create LOYALTY_TIER_UPGRADE notification for the user
  }
}

/**
 * Credits points to an account
 */
async function creditPoints({
  accountId,
  type,
  points,
  description,
  referenceId,
}: {
  accountId: string;
  type: PointTransactionType;
  points: number; // Must be positive
  description?: string;
  referenceId?: string;
}): Promise<void> {
  if (points <= 0) return;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Create transaction log
    const expiresAt = addMonths(
      new Date(),
      LOYALTY_CONFIG.POINTS_EXPIRY_MONTHS,
    );

    await tx.pointTransaction.create({
      data: {
        loyaltyAccountId: accountId,
        type,
        points, // Positive
        description,
        referenceId,
        expiresAt,
      },
    });

    // 2. Update account balances
    await tx.loyaltyAccount.update({
      where: { id: accountId },
      data: {
        currentPoints: { increment: points },
        lifetimePoints: { increment: points }, // Lifetime only goes up
      },
    });
  });

  // 3. Check for tier upgrade asynchronously
  await recalculateTier(accountId);
}

/**
 * Debits points from an account
 */
async function debitPoints({
  accountId,
  type,
  points,
  description,
  referenceId,
}: {
  accountId: string;
  type: PointTransactionType;
  points: number; // Must be positive, we negate it here
  description?: string;
  referenceId?: string;
}): Promise<void> {
  if (points <= 0) return;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const account = await tx.loyaltyAccount.findUnique({
      where: { id: accountId },
      select: { currentPoints: true },
    });

    if (!account || account.currentPoints < points) {
      throw new Error("Saldo de pontos insuficiente.");
    }

    // 1. Create transaction log
    await tx.pointTransaction.create({
      data: {
        loyaltyAccountId: accountId,
        type,
        points: -Math.abs(points), // Ensure negative
        description,
        referenceId,
      },
    });

    // 2. Update account balance (currentPoints only)
    await tx.loyaltyAccount.update({
      where: { id: accountId },
      data: {
        currentPoints: { decrement: points },
      },
    });
  });
}

export const LoyaltyService = {
  createAccount,
  getOrCreateAccount,
  recalculateTier,
  creditPoints,
  debitPoints,
};
