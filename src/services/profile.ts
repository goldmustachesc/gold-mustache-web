import { prisma } from "@/lib/prisma";

/**
 * Fetch a user profile by Supabase userId.
 */
export async function getProfileByUserId(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
  });
}

/**
 * Fetch all appointments for a client (past + future) with barber/service info.
 * Used for LGPD data export (Art. 18, V).
 */
export async function getAppointmentsForExport(clientId: string) {
  return prisma.appointment.findMany({
    where: { clientId },
    include: {
      barber: {
        select: { name: true },
      },
      service: {
        select: {
          name: true,
          price: true,
          duration: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });
}
