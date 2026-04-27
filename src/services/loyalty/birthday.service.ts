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

function birthdayBonusWhere(
  accountIds: string | string[],
  year: number,
): {
  loyaltyAccountId: string | { in: string[] };
  type: PointTransactionType;
  referenceId: string;
} {
  return {
    loyaltyAccountId: Array.isArray(accountIds)
      ? { in: accountIds }
      : accountIds,
    type: PointTransactionType.EARNED_BIRTHDAY,
    referenceId: `birthday-${year}`,
  };
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
  const existingAccountIds = await getBirthdayBonusAccountIdsForYear(
    [accountId],
    year,
  );

  return existingAccountIds.has(accountId);
}

async function getBirthdayBonusAccountIdsForYear(
  accountIds: string[],
  year: number,
): Promise<Set<string>> {
  if (accountIds.length === 0) {
    return new Set();
  }

  const existing = await prisma.pointTransaction.findMany({
    where: birthdayBonusWhere(accountIds, year),
    select: {
      loyaltyAccountId: true,
    },
  });

  return new Set(existing.map((item) => item.loyaltyAccountId));
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

  const accountIds = birthdays
    .map((profile) => profile.loyaltyAccount?.id)
    .filter((id): id is string => Boolean(id));
  const alreadyCreditedAccountIds = await getBirthdayBonusAccountIdsForYear(
    accountIds,
    year,
  );

  const { LoyaltyNotificationService } = await import("./notification.service");

  for (const profile of birthdays) {
    if (!profile.loyaltyAccount) continue;

    if (alreadyCreditedAccountIds.has(profile.loyaltyAccount.id)) continue;

    try {
      await LoyaltyService.creditPoints({
        accountId: profile.loyaltyAccount.id,
        type: PointTransactionType.EARNED_BIRTHDAY,
        points: LOYALTY_CONFIG.BIRTHDAY_BONUS,
        description: `Bônus de aniversário ${year}`,
        referenceId: `birthday-${year}`,
      });

      await LoyaltyNotificationService.notifyBirthdayBonus(
        profile.id,
        LOYALTY_CONFIG.BIRTHDAY_BONUS,
      );

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
  getBirthdayBonusAccountIdsForYear,
  creditBirthdayBonuses,
};
