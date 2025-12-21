import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Busca o barbeiro existente
  const barber = await prisma.barber.findFirst();

  if (!barber) {
    console.log("❌ Nenhum barbeiro encontrado. Rode seed-barber.ts primeiro.");
    process.exit(1);
  }

  console.log(`\n✅ Barbeiro encontrado: ${barber.name}\n`);

  // Criar serviços básicos
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
  ];

  for (const service of services) {
    // Verifica se já existe
    const existing = await prisma.service.findUnique({
      where: { slug: service.slug },
    });

    if (existing) {
      console.log(`⏭️  Serviço "${service.name}" já existe`);

      // Verifica se já está associado ao barbeiro
      const link = await prisma.barberService.findFirst({
        where: { barberId: barber.id, serviceId: existing.id },
      });

      if (!link) {
        await prisma.barberService.create({
          data: { barberId: barber.id, serviceId: existing.id },
        });
        console.log(`   ↳ Associado ao barbeiro`);
      }
      continue;
    }

    const created = await prisma.service.create({
      data: service,
    });

    await prisma.barberService.create({
      data: { barberId: barber.id, serviceId: created.id },
    });

    console.log(`✅ Serviço criado: ${service.name}`);
  }

  console.log("\n💈 Serviços configurados!\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
