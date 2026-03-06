import { prisma } from "@/lib/prisma";
import type { Prisma, Redemption } from "@prisma/client";
import { PointTransactionType } from "@prisma/client";
import { addDays } from "date-fns";
import crypto from "node:crypto";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";

type RedemptionWithDetails = Prisma.RedemptionGetPayload<{
  include: { reward: true; loyaltyAccount: { include: { profile: true } } };
}>;

const ALPHANUMERIC_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRedemptionCode(): string {
  const bytes = crypto.randomBytes(LOYALTY_CONFIG.REDEMPTION_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < LOYALTY_CONFIG.REDEMPTION_CODE_LENGTH; i++) {
    code += ALPHANUMERIC_CHARS[bytes[i] % ALPHANUMERIC_CHARS.length];
  }
  return code;
}

async function redeemReward(
  accountId: string,
  rewardId: string,
): Promise<Redemption> {
  const { redemption, rewardName } = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const account = await tx.loyaltyAccount.findUnique({
        where: { id: accountId },
        select: { id: true, currentPoints: true },
      });

      if (!account) {
        throw new Error("Conta de fidelidade não encontrada.");
      }

      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });

      if (!reward) {
        throw new Error("Recompensa não encontrada.");
      }

      if (!reward.active) {
        throw new Error("Recompensa não está ativa.");
      }

      if (reward.stock !== null && reward.stock <= 0) {
        throw new Error("Recompensa sem estoque disponível.");
      }

      if (account.currentPoints < reward.pointsCost) {
        throw new Error("Saldo de pontos insuficiente.");
      }

      const expiresAt = addDays(
        new Date(),
        LOYALTY_CONFIG.REDEMPTION_VALIDITY_DAYS,
      );

      const MAX_CODE_RETRIES = 3;
      let created: Redemption | undefined;

      for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
        const code = generateRedemptionCode();
        try {
          created = await tx.redemption.create({
            data: {
              loyaltyAccountId: accountId,
              rewardId,
              pointsSpent: reward.pointsCost,
              code,
              expiresAt,
            },
          });
          break;
        } catch (error: unknown) {
          const isUniqueViolation =
            error !== null &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002";
          if (!isUniqueViolation || attempt === MAX_CODE_RETRIES - 1) {
            throw error;
          }
        }
      }

      if (!created) {
        throw new Error("Falha ao gerar código de resgate único.");
      }

      await tx.pointTransaction.create({
        data: {
          loyaltyAccountId: accountId,
          type: PointTransactionType.REDEEMED,
          points: -Math.abs(reward.pointsCost),
          description: `Resgate: ${reward.name}`,
          referenceId: created.id,
        },
      });

      await tx.loyaltyAccount.update({
        where: { id: accountId },
        data: { currentPoints: { decrement: reward.pointsCost } },
      });

      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: rewardId },
          data: { stock: { decrement: 1 } },
        });
      }

      return { redemption: created, rewardName: reward.name };
    },
  );

  try {
    const { LoyaltyNotificationService } = await import(
      "./notification.service"
    );
    await LoyaltyNotificationService.notifyRewardRedeemed(
      accountId,
      rewardName,
      redemption.code,
    );
  } catch {}

  return redemption;
}

async function validateRedemptionCode(
  code: string,
): Promise<RedemptionWithDetails> {
  const redemption = await prisma.redemption.findUnique({
    where: { code },
    include: {
      reward: true,
      loyaltyAccount: { include: { profile: true } },
    },
  });

  if (!redemption) {
    throw new Error("Código de resgate não encontrado.");
  }

  if (redemption.usedAt !== null) {
    throw new Error("Código de resgate já foi utilizado.");
  }

  if (redemption.expiresAt < new Date()) {
    throw new Error("Código de resgate expirado.");
  }

  return redemption;
}

async function markRedemptionAsUsed(code: string): Promise<Redemption> {
  const result = await prisma.redemption.updateMany({
    where: { code, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (result.count === 0) {
    const existing = await prisma.redemption.findUnique({ where: { code } });
    if (!existing) {
      throw new Error("Código de resgate não encontrado.");
    }
    throw new Error("Código de resgate já foi utilizado.");
  }

  const redemption = await prisma.redemption.findUnique({
    where: { code },
  });

  if (!redemption) {
    throw new Error("Código de resgate não encontrado.");
  }

  return redemption;
}

export const RewardsService = {
  generateRedemptionCode,
  redeemReward,
  validateRedemptionCode,
  markRedemptionAsUsed,
};
