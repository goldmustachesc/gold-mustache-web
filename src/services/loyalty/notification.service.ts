import { prisma } from "@/lib/prisma";
import { createNotification } from "@/services/notification";
import { NotificationType, type LoyaltyTier } from "@prisma/client";
import { format } from "date-fns";

const TIER_DISPLAY_NAMES: Record<LoyaltyTier, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  DIAMOND: "Diamond",
};

async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error("[LoyaltyNotification] Failed to send notification:", error);
  }
}

async function resolveUserIdFromProfile(
  profileId: string,
): Promise<string | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });
  return profile?.userId ?? null;
}

async function resolveUserIdFromAccount(
  accountId: string,
): Promise<string | null> {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { id: accountId },
    select: { profile: { select: { userId: true } } },
  });
  return account?.profile?.userId ?? null;
}

async function notifyPointsEarned(
  profileId: string,
  points: number,
  description: string,
): Promise<void> {
  await safeNotify(async () => {
    const userId = await resolveUserIdFromProfile(profileId);
    if (!userId) return;

    await createNotification({
      userId,
      type: NotificationType.LOYALTY_POINTS_EARNED,
      title: "Pontos creditados!",
      message: `+${points} pontos — ${description}`,
    });
  });
}

async function notifyTierUpgrade(
  accountId: string,
  newTier: LoyaltyTier,
  previousTier: LoyaltyTier,
): Promise<void> {
  await safeNotify(async () => {
    const userId = await resolveUserIdFromAccount(accountId);
    if (!userId) return;

    const newName = TIER_DISPLAY_NAMES[newTier];
    const previousName = TIER_DISPLAY_NAMES[previousTier];

    await createNotification({
      userId,
      type: NotificationType.LOYALTY_TIER_UPGRADE,
      title: `Parabéns! Novo nível: ${newName}`,
      message: `Você subiu de ${previousName} para ${newName}!`,
    });
  });
}

async function notifyRewardRedeemed(
  accountId: string,
  rewardName: string,
  code: string,
): Promise<void> {
  await safeNotify(async () => {
    const userId = await resolveUserIdFromAccount(accountId);
    if (!userId) return;

    await createNotification({
      userId,
      type: NotificationType.LOYALTY_REWARD_REDEEMED,
      title: "Resgate confirmado!",
      message: `${rewardName} — Código: ${code}`,
    });
  });
}

async function notifyPointsExpiring(
  profileId: string,
  points: number,
  expiresAt: Date,
): Promise<void> {
  await safeNotify(async () => {
    const userId = await resolveUserIdFromProfile(profileId);
    if (!userId) return;

    const formattedDate = format(expiresAt, "dd/MM/yyyy");

    await createNotification({
      userId,
      type: NotificationType.LOYALTY_POINTS_EXPIRING,
      title: "Pontos prestes a expirar",
      message: `${points} pontos expiram em ${formattedDate}`,
    });
  });
}

async function notifyReferralBonus(
  profileId: string,
  points: number,
): Promise<void> {
  await safeNotify(async () => {
    const userId = await resolveUserIdFromProfile(profileId);
    if (!userId) return;

    await createNotification({
      userId,
      type: NotificationType.LOYALTY_REFERRAL_BONUS,
      title: "Bônus de indicação!",
      message: `+${points} pontos por indicação de amigo`,
    });
  });
}

async function notifyBirthdayBonus(
  profileId: string,
  points: number,
): Promise<void> {
  await safeNotify(async () => {
    const userId = await resolveUserIdFromProfile(profileId);
    if (!userId) return;

    await createNotification({
      userId,
      type: NotificationType.LOYALTY_BIRTHDAY_BONUS,
      title: "Feliz aniversário!",
      message: `+${points} pontos de presente de aniversário`,
    });
  });
}

export const LoyaltyNotificationService = {
  notifyPointsEarned,
  notifyTierUpgrade,
  notifyRewardRedeemed,
  notifyPointsExpiring,
  notifyReferralBonus,
  notifyBirthdayBonus,
};
