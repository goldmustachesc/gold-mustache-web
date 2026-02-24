import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script para limpar o banco de staging
 * Mantém: Services, Barbers, BarberServices, WorkingHours, ShopHours
 * Remove: Appointments, Notifications, GuestClients, Profiles (exceto barbeiros),
 *         CookieConsent, ShopClosures, BarberAbsences
 *
 * Rode: npx tsx prisma/cleanup-staging.ts
 */

// Dados dos barbeiros para atualizar avatars
const BARBERS_DATA = [
  { name: "Ygor Luan", avatarUrl: "/barbers/ygor.webp" },
  { name: "Vitor Maronez", avatarUrl: "/barbers/vitor.webp" },
  { name: "David Trindade", avatarUrl: "/barbers/david.webp" },
  { name: "João Vitor", avatarUrl: "/barbers/joao.webp" },
];

async function main() {
  const results = {
    appointments: 0,
    notifications: 0,
    guests: 0,
    cookieConsents: 0,
    shopClosures: 0,
    absences: 0,
    profiles: 0,
  };

  try {
    // 1. Deletar Appointments
    const appointmentsDeleted = await prisma.appointment.deleteMany();
    results.appointments = appointmentsDeleted.count;

    // 2. Deletar Notifications
    const notificationsDeleted = await prisma.notification.deleteMany();
    results.notifications = notificationsDeleted.count;

    // 3. Deletar GuestClients
    const guestsDeleted = await prisma.guestClient.deleteMany();
    results.guests = guestsDeleted.count;

    // 4. Deletar CookieConsent
    const cookieConsentDeleted = await prisma.cookieConsent.deleteMany();
    results.cookieConsents = cookieConsentDeleted.count;

    // 5. Deletar ShopClosures
    const shopClosuresDeleted = await prisma.shopClosure.deleteMany();
    results.shopClosures = shopClosuresDeleted.count;

    // 6. Deletar BarberAbsences
    const absencesDeleted = await prisma.barberAbsence.deleteMany();
    results.absences = absencesDeleted.count;

    // 7. Deletar Profiles que não são de barbeiros
    const barbers = await prisma.barber.findMany({ select: { userId: true } });
    const barberUserIds = barbers.map((b) => b.userId);

    const profilesDeleted = await prisma.profile.deleteMany({
      where: {
        userId: { notIn: barberUserIds },
      },
    });
    results.profiles = profilesDeleted.count;

    // 8. Atualizar avatars dos barbeiros
    for (const barber of BARBERS_DATA) {
      await prisma.barber.updateMany({
        where: { name: barber.name },
        data: { avatarUrl: barber.avatarUrl },
      });
    }
  } catch (error) {
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
