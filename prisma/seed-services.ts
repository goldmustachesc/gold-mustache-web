import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Serviços da barbearia Gold Mustache
const SERVICES_DATA = [
  {
    slug: "corte-tradicional",
    name: "Corte Simples",
    description: "Corte simples com tesoura e navalha",
    price: 30.0,
    duration: 30, // Arredondado de 20 para múltiplo de 15
  },
  {
    slug: "corte-degrade",
    name: "Corte Degradê Navalhado",
    description: "Corte degradê navalhado com tesoura",
    price: 60.0,
    duration: 45,
  },
  {
    slug: "corte-barba",
    name: "Corte + Barba",
    description: "Corte e barba completo",
    price: 90.0,
    duration: 60,
  },
  {
    slug: "barba-completa",
    name: "Barba Completa",
    description: "Aparar e modelar",
    price: 45.0,
    duration: 30,
  },
  {
    slug: "corte-na-tesoura",
    name: "Corte na Tesoura",
    description: "Corte de cabelo todo na tesoura",
    price: 60.0,
    duration: 45,
  },
  {
    slug: "corte-americano",
    name: "Corte Americano",
    description: "Corte com degradê só nos pezinhos",
    price: 50.0,
    duration: 45,
  },
  {
    slug: "sobrancelha-na-navalha",
    name: "Sobrancelha na Navalha",
    description: "Design e aparar sobrancelhas",
    price: 20.0,
    duration: 15,
  },
  {
    slug: "corte-low-fade",
    name: "Corte Low Fade",
    description: "Corte com degradê mais baixo",
    price: 60.0,
    duration: 45, // Arredondado de 50 para múltiplo de 15
  },
  {
    slug: "cera-nariz-ouvido",
    name: "Cera Nariz e Ouvido",
    description: null,
    price: 30.0,
    duration: 15,
  },
  {
    slug: "corte-degrade-tradicional",
    name: "Corte Degradê Tradicional",
    description: "Corte degradê apartir do pente 1",
    price: 45.0,
    duration: 30, // Arredondado de 35 para múltiplo de 15
  },
  {
    slug: "corte-degrade-na-zero",
    name: "Corte Degradê na Zero",
    description: "Corte degradê apartir da zero",
    price: 50.0,
    duration: 30, // Arredondado de 35 para múltiplo de 15
  },
  {
    slug: "progressiva-relaxamento",
    name: "Progressiva / Relaxamento",
    description: "Alisamento dos fios",
    price: 100.0,
    duration: 45, // Arredondado de 50 para múltiplo de 15
  },
  {
    slug: "luzes",
    name: "Luzes",
    description: null,
    price: 150.0,
    duration: 90,
  },
  {
    slug: "platinado",
    name: "Platinado",
    description: null,
    price: 200.0,
    duration: 120,
  },
  {
    slug: "sobrancelha-na-pinca",
    name: "Sobrancelha na Pinça",
    description: null,
    price: 30.0,
    duration: 15,
  },
  {
    slug: "combo-completo",
    name: "Combo Completo",
    description:
      "Corte + Barba + Sobrancelha - O pacote completo para um visual impecável",
    price: 100.0,
    duration: 60,
  },
];

async function main() {
  console.log("\n🔄 Iniciando seed de serviços...\n");

  // Primeiro, desativa serviços antigos que não estão na lista
  const existingSlugs = SERVICES_DATA.map((s) => s.slug);
  await prisma.service.updateMany({
    where: {
      slug: { notIn: existingSlugs },
    },
    data: { active: false },
  });

  // Busca o barbeiro existente para associação
  const barbers = await prisma.barber.findMany();

  for (const service of SERVICES_DATA) {
    // Verifica se já existe
    const existing = await prisma.service.findUnique({
      where: { slug: service.slug },
    });

    if (existing) {
      // Atualiza o serviço existente
      await prisma.service.update({
        where: { slug: service.slug },
        data: {
          name: service.name,
          description: service.description,
          price: service.price,
          duration: service.duration,
          active: true,
        },
      });
      console.log(`✏️  Serviço atualizado: ${service.name}`);
    } else {
      // Cria novo serviço
      const created = await prisma.service.create({
        data: {
          slug: service.slug,
          name: service.name,
          description: service.description,
          price: service.price,
          duration: service.duration,
          active: true,
        },
      });

      // Associa a todos os barbeiros
      for (const barber of barbers) {
        await prisma.barberService.create({
          data: { barberId: barber.id, serviceId: created.id },
        });
      }

      console.log(`✅ Serviço criado: ${service.name}`);
    }
  }

  // Garante que todos os serviços estejam associados a todos os barbeiros
  const allServices = await prisma.service.findMany({
    where: { active: true },
  });

  for (const barber of barbers) {
    for (const service of allServices) {
      const link = await prisma.barberService.findFirst({
        where: { barberId: barber.id, serviceId: service.id },
      });

      if (!link) {
        await prisma.barberService.create({
          data: { barberId: barber.id, serviceId: service.id },
        });
        console.log(
          `   ↳ ${service.name} associado ao barbeiro ${barber.name}`,
        );
      }
    }
  }

  const count = await prisma.service.count({ where: { active: true } });
  console.log(`\n💈 ${count} serviços ativos configurados!\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
