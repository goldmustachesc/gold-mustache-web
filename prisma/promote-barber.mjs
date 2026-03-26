import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const userId = args.find((a) => !a.startsWith("--"));
const setup = args.includes("--setup");

function getArgValue(key) {
  const byEquals = args.find((a) => a.startsWith(`${key}=`));
  if (byEquals) return byEquals.slice(key.length + 1);

  const idx = args.indexOf(key);
  if (idx !== -1)
    return args[idx + 1] && !args[idx + 1].startsWith("--")
      ? args[idx + 1]
      : null;

  return null;
}

const nameFromArgs = getArgValue("--name");

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

if (!userId) {
  console.error("Uso:");
  console.error(
    '  node prisma/promote-barber.mjs <USER_UUID> [--name "Nome"] [--setup]',
  );
  console.error("");
  console.error("Exemplos:");
  console.error(
    "  node prisma/promote-barber.mjs 014ec43c-ce5c-4eac-b996-2a14e0b8eeda --setup",
  );
  console.error(
    '  node prisma/promote-barber.mjs 014ec43c-ce5c-4eac-b996-2a14e0b8eeda --name "João"',
  );
  process.exit(1);
}

if (!isUuid(userId)) {
  console.error("❌ USER_UUID inválido:", userId);
  process.exit(1);
}

const prisma = new PrismaClient();

async function ensureDefaults(barberId) {
  const workingHoursCount = await prisma.workingHours.count({
    where: { barberId },
  });
  if (workingHoursCount === 0) {
    const workingDays = [1, 2, 3, 4, 5, 6]; // Seg-Sáb
    await prisma.workingHours.createMany({
      data: workingDays.map((dayOfWeek) => ({
        barberId,
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      })),
      skipDuplicates: true,
    });
  }

  const barberServicesCount = await prisma.barberService.count({
    where: { barberId },
  });
  if (barberServicesCount === 0) {
    const services = await prisma.service.findMany({
      where: { active: true },
      select: { id: true },
    });

    if (services.length > 0) {
      await prisma.barberService.createMany({
        data: services.map((s) => ({ barberId, serviceId: s.id })),
        skipDuplicates: true,
      });
    }
  }
}

async function main() {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { fullName: true, avatarUrl: true },
  });

  const name =
    (typeof nameFromArgs === "string" && nameFromArgs.trim().length
      ? nameFromArgs.trim()
      : null) ??
    profile?.fullName ??
    "Barbeiro";

  const barber = await prisma.barber.upsert({
    where: { userId },
    update: {
      name,
      avatarUrl: profile?.avatarUrl ?? null,
      active: true,
    },
    create: {
      userId,
      name,
      avatarUrl: profile?.avatarUrl ?? null,
      active: true,
    },
  });

  if (setup) {
    await ensureDefaults(barber.id);
  }

  console.log("✅ Usuário cadastrado como BARBEIRO:", {
    id: barber.id,
    userId: barber.userId,
    name: barber.name,
    active: barber.active,
    setupApplied: setup,
  });

  console.log(
    "ℹ️  Observação: isso NÃO altera o profiles.role. Você pode ser barbeiro e ADMIN ao mesmo tempo.",
  );
}

main()
  .catch((error) => {
    console.error("❌ Falha ao cadastrar barbeiro:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
