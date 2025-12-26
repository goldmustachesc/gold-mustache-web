import { PrismaClient, UserRole } from "@prisma/client";

const userId = process.argv[2];

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

if (!userId) {
  console.error("Uso:");
  console.error("  node prisma/promote-admin.mjs <USER_UUID>");
  process.exit(1);
}

if (!isUuid(userId)) {
  console.error("❌ USER_UUID inválido:", userId);
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: { role: UserRole.ADMIN },
    create: {
      userId,
      role: UserRole.ADMIN,
      fullName: null,
      phone: null,
      avatarUrl: null,
    },
  });

  console.log("✅ Perfil promovido para ADMIN:", {
    id: profile.id,
    userId: profile.userId,
    role: profile.role,
  });
}

main()
  .catch((error) => {
    console.error("❌ Falha ao promover admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
