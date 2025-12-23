import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🚀 Iniciando seed de staging...\n");

  // Barbeiros
  const barbers = [
    { name: "Ygor Luan", avatarUrl: "/barbers/ygor.webp" },
    { name: "Vitor Maronez", avatarUrl: "/barbers/vitor.webp" },
    { name: "David Trindade", avatarUrl: null },
    { name: "João Vitor", avatarUrl: "/barbers/joao.webp" },
  ];

  const createdBarbers = [];

  for (const barber of barbers) {
    const existing = await prisma.barber.findFirst({
      where: { name: barber.name },
    });

    if (existing) {
      console.log(`⏭️  Barbeiro "${barber.name}" já existe`);
      createdBarbers.push(existing);
      continue;
    }

    const created = await prisma.barber.create({
      data: {
        userId: randomUUID(), // UUID temporário
        name: barber.name,
        avatarUrl: barber.avatarUrl,
        active: true,
      },
    });

    console.log(`✅ Barbeiro criado: ${barber.name}`);
    createdBarbers.push(created);

    // Criar horários de trabalho (Seg-Sáb, 9h-18h)
    const workingDays = [1, 2, 3, 4, 5, 6];
    for (const dayOfWeek of workingDays) {
      await prisma.workingHours.create({
        data: {
          barberId: created.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
          breakStart: "12:00",
          breakEnd: "13:00",
        },
      });
    }
    console.log(`   📅 Horários criados (Seg-Sáb, 9h-18h)`);
  }

  // Serviços
  const services = [
    {
      name: "Corte de Cabelo",
      slug: "corte-cabelo",
      duration: 30,
      price: 45.0,
    },
    { name: "Barba", slug: "barba", duration: 20, price: 30.0 },
    { name: "Corte + Barba", slug: "corte-barba", duration: 45, price: 65.0 },
    { name: "Sobrancelha", slug: "sobrancelha", duration: 10, price: 15.0 },
    { name: "Pigmentação", slug: "pigmentacao", duration: 60, price: 80.0 },
    { name: "Hidratação", slug: "hidratacao", duration: 30, price: 40.0 },
  ];

  console.log("\n💈 Criando serviços...\n");

  for (const service of services) {
    let serviceRecord = await prisma.service.findUnique({
      where: { slug: service.slug },
    });

    if (serviceRecord) {
      console.log(`⏭️  Serviço "${service.name}" já existe`);
    } else {
      serviceRecord = await prisma.service.create({
        data: service,
      });
      console.log(`✅ Serviço criado: ${service.name}`);
    }

    // Associar a todos os barbeiros
    for (const barber of createdBarbers) {
      const link = await prisma.barberService.findFirst({
        where: { barberId: barber.id, serviceId: serviceRecord.id },
      });

      if (!link) {
        await prisma.barberService.create({
          data: { barberId: barber.id, serviceId: serviceRecord.id },
        });
      }
    }
  }

  console.log("\n✨ Seed completo!\n");

  // Resumo
  const totalBarbers = await prisma.barber.count();
  const totalServices = await prisma.service.count();
  console.log(
    `📊 Resumo: ${totalBarbers} barbeiros, ${totalServices} serviços\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
