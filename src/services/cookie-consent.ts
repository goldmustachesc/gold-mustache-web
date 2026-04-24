import { prisma } from "@/lib/prisma";

export interface ConsentData {
  id: string;
  analyticsConsent: boolean;
  marketingConsent: boolean;
  consentDate: string;
  updatedAt: string;
}

export interface GetConsentInput {
  userId?: string;
  anonymousId?: string;
}

export interface SaveConsentInput {
  analyticsConsent: boolean;
  marketingConsent: boolean;
  userId?: string | null;
  anonymousId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Retrieve the most recent consent record for a user or anonymous visitor.
 * Returns null if no record is found.
 */
export async function getConsent(
  input: GetConsentInput,
): Promise<ConsentData | null> {
  if (!input.userId && !input.anonymousId) return null;

  const where = input.userId
    ? { userId: input.userId }
    : { anonymousId: input.anonymousId };

  const consent = await prisma.cookieConsent.findFirst({
    where,
    orderBy: { consentDate: "desc" },
  });

  if (!consent) {
    return null;
  }

  return {
    id: consent.id,
    analyticsConsent: consent.analyticsConsent,
    marketingConsent: consent.marketingConsent,
    consentDate: consent.consentDate.toISOString(),
    updatedAt: consent.updatedAt.toISOString(),
  };
}

/**
 * Retrieve all consent records for a user (for LGPD data export).
 */
export async function getConsentsByUserId(userId: string): Promise<
  {
    id: string;
    analyticsConsent: boolean;
    marketingConsent: boolean;
    consentDate: string;
    updatedAt: string;
  }[]
> {
  const consents = await prisma.cookieConsent.findMany({
    where: { userId },
    orderBy: { consentDate: "desc" },
  });

  return consents.map((c) => ({
    id: c.id,
    analyticsConsent: c.analyticsConsent,
    marketingConsent: c.marketingConsent,
    consentDate: c.consentDate.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

/**
 * Save or update cookie consent using a transaction to prevent race conditions.
 */
export async function saveConsent(
  input: SaveConsentInput,
): Promise<ConsentData> {
  const consent = await prisma.$transaction(async (tx) => {
    const where = input.userId
      ? { userId: input.userId }
      : { anonymousId: input.anonymousId ?? undefined };

    const existing = await tx.cookieConsent.findFirst({ where });

    if (existing) {
      return tx.cookieConsent.update({
        where: { id: existing.id },
        data: {
          analyticsConsent: input.analyticsConsent,
          marketingConsent: input.marketingConsent,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          userId: input.userId ?? existing.userId,
        },
      });
    }

    return tx.cookieConsent.create({
      data: {
        userId: input.userId ?? null,
        anonymousId: input.userId ? null : input.anonymousId,
        analyticsConsent: input.analyticsConsent,
        marketingConsent: input.marketingConsent,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  });

  return {
    id: consent.id,
    analyticsConsent: consent.analyticsConsent,
    marketingConsent: consent.marketingConsent,
    consentDate: consent.consentDate.toISOString(),
    updatedAt: consent.updatedAt.toISOString(),
  };
}
