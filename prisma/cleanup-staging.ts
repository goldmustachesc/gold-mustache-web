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
  console.log("\n🧹 Iniciando limpeza do banco de staging...\n");

  // 1. Deletar Appointments
  const appointmentsDeleted = await prisma.appointment.deleteMany();
  console.log(`🗑️  Appointments removidos: ${appointmentsDeleted.count}`);

  // 2. Deletar Notifications
  const notificationsDeleted = await prisma.notification.deleteMany();
  console.log(`🗑️  Notifications removidos: ${notificationsDeleted.count}`);

  // 3. Deletar GuestClients
  const guestsDeleted = await prisma.guestClient.deleteMany();
  console.log(`🗑️  GuestClients removidos: ${guestsDeleted.count}`);

  // 4. Deletar CookieConsent
  const cookieConsentDeleted = await prisma.cookieConsent.deleteMany();
  console.log(`🗑️  CookieConsents removidos: ${cookieConsentDeleted.count}`);

  // 5. Deletar ShopClosures
  const shopClosuresDeleted = await prisma.shopClosure.deleteMany();
  console.log(`🗑️  ShopClosures removidos: ${shopClosuresDeleted.count}`);

  // 6. Deletar BarberAbsences
  const absencesDeleted = await prisma.barberAbsence.deleteMany();
  console.log(`🗑️  BarberAbsences removidos: ${absencesDeleted.count}`);

  // 7. Deletar Profiles que não são de barbeiros
  const barbers = await prisma.barber.findMany({ select: { userId: true } });
  const barberUserIds = barbers.map((b) => b.userId);

  const profilesDeleted = await prisma.profile.deleteMany({
    where: {
      userId: { notIn: barberUserIds },
    },
  });
  console.log(
    `🗑️  Profiles removidos (exceto barbeiros): ${profilesDeleted.count}`,
  );

  // 8. Atualizar avatars dos barbeiros
  console.log("\n🔄 Atualizando avatars dos barbeiros...\n");
  for (const barber of BARBERS_DATA) {
    const updated = await prisma.barber.updateMany({
      where: { name: barber.name },
      data: { avatarUrl: barber.avatarUrl },
    });
    if (updated.count > 0) {
      console.log(`✅ ${barber.name}: ${barber.avatarUrl}`);
    }
  }

  // Resumo final
  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 RESUMO - Dados mantidos:");
  console.log("=".repeat(50));

  const servicesCount = await prisma.service.count({ where: { active: true } });
  const barbersCount = await prisma.barber.count({ where: { active: true } });
  const workingHoursCount = await prisma.workingHours.count();
  const shopHoursCount = await prisma.shopHours.count();
  const barberServicesCount = await prisma.barberService.count();

  console.log(`💈 Serviços ativos: ${servicesCount}`);
  console.log(`👨‍💼 Barbeiros ativos: ${barbersCount}`);
  console.log(`📅 WorkingHours: ${workingHoursCount}`);
  console.log(`🏪 ShopHours: ${shopHoursCount}`);
  console.log(`🔗 BarberServices: ${barberServicesCount}`);

  // Listar barbeiros com avatars
  const allBarbers = await prisma.barber.findMany({
    where: { active: true },
    select: { name: true, avatarUrl: true },
  });
  console.log("\n👥 Barbeiros:");
  for (const b of allBarbers) {
    console.log(`   - ${b.name}: ${b.avatarUrl || "(sem avatar)"}`);
  }

  console.log("\n✨ Limpeza concluída!\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
