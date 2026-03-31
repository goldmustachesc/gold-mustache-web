import { prisma } from "@/lib/prisma";
import { migrateGuestBanToProfile } from "@/services/banned-client";

export interface ClaimGuestAppointmentsResult {
  linked: boolean;
  appointmentsTransferred: number;
  guestClientClaimed: boolean;
  banMigrated: boolean;
  alreadyClaimed: boolean;
}

interface ClaimGuestAppointmentsParams {
  profileId: string;
  guestToken: string;
}

export async function claimGuestAppointmentsToProfile(
  params: ClaimGuestAppointmentsParams,
): Promise<ClaimGuestAppointmentsResult> {
  const { profileId, guestToken } = params;

  const normalizedToken = guestToken.trim();
  if (!normalizedToken) {
    throw new Error("MISSING_GUEST_TOKEN");
  }

  return prisma.$transaction(async (tx) => {
    const guestClient = await tx.guestClient.findUnique({
      where: { accessToken: normalizedToken },
      select: {
        id: true,
        claimedAt: true,
        claimedByProfileId: true,
        accessTokenConsumedAt: true,
      },
    });

    if (!guestClient) {
      throw new Error("GUEST_NOT_FOUND");
    }

    if (
      guestClient.claimedByProfileId &&
      guestClient.claimedByProfileId !== profileId
    ) {
      throw new Error("GUEST_ALREADY_CLAIMED");
    }

    const updateResult = await tx.appointment.updateMany({
      where: {
        guestClientId: guestClient.id,
      },
      data: {
        clientId: profileId,
        guestClientId: null,
      },
    });

    const shouldMarkClaimed =
      guestClient.claimedByProfileId !== profileId ||
      guestClient.claimedAt === null;
    const shouldConsumeToken = guestClient.accessTokenConsumedAt === null;

    if (shouldMarkClaimed || shouldConsumeToken) {
      const now = new Date();
      await tx.guestClient.update({
        where: { id: guestClient.id },
        data: {
          ...(shouldMarkClaimed
            ? {
                claimedAt: now,
                claimedByProfileId: profileId,
              }
            : {}),
          ...(shouldConsumeToken
            ? {
                accessTokenConsumedAt: now,
              }
            : {}),
        },
      });
    }

    const banMigrated = await migrateGuestBanToProfile(tx, {
      guestClientId: guestClient.id,
      profileId,
    });

    return {
      linked: updateResult.count > 0 || shouldMarkClaimed || shouldConsumeToken,
      appointmentsTransferred: updateResult.count,
      guestClientClaimed: shouldMarkClaimed,
      banMigrated,
      alreadyClaimed:
        guestClient.claimedByProfileId === profileId &&
        guestClient.claimedAt !== null,
    };
  });
}
