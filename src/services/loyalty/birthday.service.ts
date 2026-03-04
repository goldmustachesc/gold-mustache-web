import { prisma } from "@/lib/prisma";
import { PointTransactionType } from "@prisma/client";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";
import { LoyaltyService } from "./loyalty.service";

export interface BirthdayBonusResult {
  processedCount: number;
  totalPointsCredited: number;
  failedCount: number;
}

interface ProfileWithLoyalty {
  id: string;
  birthDate: Date | null;
  loyaltyAccount: {
    id: string;
  } | null;
}

async function getTodayBirthdays(
  date: Date = new Date(),
): Promise<ProfileWithLoyalty[]> {
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const profiles = await prisma.profile.findMany({
    where: {
      birthDate: { not: null },
      loyaltyAccount: { isNot: null },
    },
    select: {
      id: true,
      birthDate: true,
      loyaltyAccount: { select: { id: true } },
    },
  });

  return profiles.filter((profile) => {
    if (!profile.birthDate || !profile.loyaltyAccount) return false;
    const bd = new Date(profile.birthDate);
    return bd.getUTCMonth() === month && bd.getUTCDate() === day;
  });
}

async function hasBirthdayBonusThisYear(
  accountId: string,
  year: number,
): Promise<boolean> {
  const existing = await prisma.pointTransaction.findFirst({
    where: {
      loyaltyAccountId: accountId,
      type: PointTransactionType.EARNED_BIRTHDAY,
      referenceId: `birthday-${year}`,
    },
  });

  return existing !== null;
}

async function creditBirthdayBonuses(
  date: Date = new Date(),
): Promise<BirthdayBonusResult> {
  const birthdays = await getTodayBirthdays(date);

  if (birthdays.length === 0) {
    return { processedCount: 0, totalPointsCredited: 0, failedCount: 0 };
  }

  const year = date.getUTCFullYear();
  let processedCount = 0;
  let totalPointsCredited = 0;
  let failedCount = 0;

  for (const profile of birthdays) {
    if (!profile.loyaltyAccount) continue;

    const alreadyCredited = await hasBirthdayBonusThisYear(
      profile.loyaltyAccount.id,
      year,
    );

    if (alreadyCredited) continue;

    try {
      await LoyaltyService.creditPoints({
        accountId: profile.loyaltyAccount.id,
        type: PointTransactionType.EARNED_BIRTHDAY,
        points: LOYALTY_CONFIG.BIRTHDAY_BONUS,
        description: `Bônus de aniversário ${year}`,
        referenceId: `birthday-${year}`,
      });

      processedCount += 1;
      totalPointsCredited += LOYALTY_CONFIG.BIRTHDAY_BONUS;
    } catch (error) {
      console.error(
        `Failed to credit birthday bonus for account ${profile.loyaltyAccount.id}`,
        error,
      );
      failedCount += 1;
    }
  }

  return { processedCount, totalPointsCredited, failedCount };
}

export const BirthdayService = {
  getTodayBirthdays,
  hasBirthdayBonusThisYear,
  creditBirthdayBonuses,
};
