import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Cria/atualiza o horário global da barbearia.
// Rode: npx tsx prisma/seed-shop-hours.ts
async function main() {
  // Default alinhado ao seed do barbeiro:
  // Seg-Sáb 09:00-18:00 com intervalo 12:00-13:00, Domingo fechado.
  const defaults = [
    {
      dayOfWeek: 0,
      isOpen: false,
      startTime: null,
      endTime: null,
      breakStart: null,
      breakEnd: null,
    },
    ...[1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      isOpen: true,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    })),
  ] as const;

  await prisma.$transaction(
    defaults.map((d) =>
      prisma.shopHours.upsert({
        where: { dayOfWeek: d.dayOfWeek },
        create: d,
        update: d,
      }),
    ),
  );

  console.log("✅ Horários globais da barbearia configurados (default).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
