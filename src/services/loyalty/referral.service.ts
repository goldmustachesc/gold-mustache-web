import { prisma } from "@/lib/prisma";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";
import { PointTransactionType, type Prisma } from "@prisma/client";
import { LoyaltyService } from "./loyalty.service";
import { addMonths } from "date-fns";

type LoyaltyAccountWithProfile = Prisma.LoyaltyAccountGetPayload<{
  include: { profile: true };
}>;

async function validateReferralCode(
  code: string,
  currentAccountId: string,
): Promise<LoyaltyAccountWithProfile> {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { referralCode: code },
    include: { profile: true },
  });

  if (!account) {
    throw new Error("Código de indicação não encontrado");
  }

  if (account.id === currentAccountId) {
    throw new Error("Você não pode usar seu próprio código de indicação");
  }

  return account;
}

async function applyReferral(
  referrerId: string,
  referredAccountId: string,
): Promise<void> {
  const referrer = await prisma.loyaltyAccount.findUnique({
    where: { id: referrerId },
  });

  if (!referrer) {
    throw new Error("Conta do indicador não encontrada");
  }

  const referred = await prisma.loyaltyAccount.findUnique({
    where: { id: referredAccountId },
  });

  if (!referred) {
    throw new Error("Conta do indicado não encontrada");
  }

  if (referred.referredById) {
    throw new Error("Esta conta já foi indicada por outro usuário");
  }

  await prisma.loyaltyAccount.update({
    where: { id: referredAccountId },
    data: { referredById: referrerId },
  });
}

async function creditReferralBonus(referredAccountId: string): Promise<void> {
  const referred = await prisma.loyaltyAccount.findUnique({
    where: { id: referredAccountId },
  });

  if (!referred?.referredById) {
    return;
  }

  const referrerId = referred.referredById;

  const credited = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const existingBonus = await tx.pointTransaction.findFirst({
        where: {
          type: PointTransactionType.EARNED_REFERRAL,
          referenceId: referredAccountId,
        },
      });

      if (existingBonus) {
        return false;
      }

      const expiresAt = addMonths(
        new Date(),
        LOYALTY_CONFIG.POINTS_EXPIRY_MONTHS,
      );

      await tx.pointTransaction.create({
        data: {
          loyaltyAccountId: referrerId,
          type: PointTransactionType.EARNED_REFERRAL,
          points: LOYALTY_CONFIG.REFERRAL_BONUS,
          description: "Bônus por indicação",
          referenceId: referredAccountId,
          expiresAt,
        },
      });

      await tx.loyaltyAccount.update({
        where: { id: referrerId },
        data: {
          currentPoints: { increment: LOYALTY_CONFIG.REFERRAL_BONUS },
          lifetimePoints: { increment: LOYALTY_CONFIG.REFERRAL_BONUS },
        },
      });

      await tx.pointTransaction.create({
        data: {
          loyaltyAccountId: referredAccountId,
          type: PointTransactionType.EARNED_REFERRAL,
          points: LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS,
          description: "Bônus de primeiro agendamento por indicação",
          referenceId: referredAccountId,
          expiresAt,
        },
      });

      await tx.loyaltyAccount.update({
        where: { id: referredAccountId },
        data: {
          currentPoints: {
            increment: LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS,
          },
          lifetimePoints: {
            increment: LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS,
          },
        },
      });

      return true;
    },
  );

  if (credited) {
    await LoyaltyService.recalculateTier(referrerId);
    await LoyaltyService.recalculateTier(referredAccountId);
  }
}

function getPartialName(fullName: string | null): string {
  if (!fullName) return "";

  const trimmed = fullName.trim();
  if (!trimmed) return "";

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];

  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export const ReferralService = {
  validateReferralCode,
  applyReferral,
  creditReferralBonus,
  getPartialName,
};
