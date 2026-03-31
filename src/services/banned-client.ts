import { prisma } from "@/lib/prisma";
import { getTodayUTCMidnight } from "@/utils/time-slots";
import type { Prisma } from "@prisma/client";
import { AppointmentStatus } from "@prisma/client";

interface BanClientParams {
  clientId: string;
  clientType: "registered" | "guest";
  reason?: string;
  bannedByBarberId: string;
}

interface IsClientBannedParams {
  profileId?: string;
  guestClientId?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

interface MigrateGuestBanToProfileParams {
  guestClientId: string;
  profileId: string;
}

export async function banClient(params: BanClientParams) {
  const { clientId, clientType, reason, bannedByBarberId } = params;

  if (clientType === "registered") {
    const profile = await prisma.profile.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!profile) throw new Error("CLIENT_NOT_FOUND");
  } else {
    const guest = await prisma.guestClient.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!guest) throw new Error("CLIENT_NOT_FOUND");
  }

  const existingBan = await prisma.bannedClient.findFirst({
    where:
      clientType === "registered"
        ? { profileId: clientId }
        : { guestClientId: clientId },
    select: { id: true },
  });

  if (existingBan) throw new Error("CLIENT_ALREADY_BANNED");

  return prisma.$transaction(async (tx) => {
    const ban = await tx.bannedClient.create({
      data: {
        ...(clientType === "registered"
          ? { profileId: clientId }
          : { guestClientId: clientId }),
        reason: reason ?? null,
        bannedBy: bannedByBarberId,
      },
    });

    const appointmentFilter =
      clientType === "registered" ? { clientId } : { guestClientId: clientId };

    await tx.appointment.updateMany({
      where: {
        ...appointmentFilter,
        status: AppointmentStatus.CONFIRMED,
        date: { gte: getTodayUTCMidnight() },
      },
      data: {
        status: AppointmentStatus.CANCELLED_BY_BARBER,
        cancelReason: "Cliente banido",
      },
    });

    return ban;
  });
}

export async function unbanClient(bannedClientId: string) {
  const ban = await prisma.bannedClient.findUnique({
    where: { id: bannedClientId },
  });

  if (!ban) throw new Error("BAN_NOT_FOUND");

  await prisma.bannedClient.delete({
    where: { id: bannedClientId },
  });
}

export async function isClientBanned(
  params: IsClientBannedParams,
): Promise<boolean> {
  const { profileId, guestClientId } = params;

  if (!profileId && !guestClientId) {
    throw new Error("INVALID_BAN_CHECK");
  }

  const ban = await prisma.bannedClient.findFirst({
    where: profileId ? { profileId } : { guestClientId },
    select: { id: true },
  });

  return !!ban;
}

export async function migrateGuestBanToProfile(
  tx: Prisma.TransactionClient,
  params: MigrateGuestBanToProfileParams,
): Promise<boolean> {
  const { guestClientId, profileId } = params;

  const guestBan = await tx.bannedClient.findFirst({
    where: { guestClientId },
    select: {
      id: true,
      reason: true,
      bannedBy: true,
    },
  });

  if (!guestBan) {
    return false;
  }

  const existingProfileBan = await tx.bannedClient.findFirst({
    where: { profileId },
    select: { id: true },
  });

  if (existingProfileBan) {
    return false;
  }

  await tx.bannedClient.create({
    data: {
      profileId,
      reason: guestBan.reason,
      bannedBy: guestBan.bannedBy,
    },
  });

  return true;
}

export async function getBannedClients(pagination: PaginationParams) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.bannedClient.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        profile: { select: { id: true, fullName: true, phone: true } },
        guestClient: { select: { id: true, fullName: true, phone: true } },
        barber: { select: { id: true, name: true } },
      },
    }),
    prisma.bannedClient.count(),
  ]);

  return { data, total };
}
