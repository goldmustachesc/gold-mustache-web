import { PrismaClient, UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Variáveis de ambiente não configuradas:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD;

if (!DEFAULT_PASSWORD) {
  console.error("Variável SEED_PASSWORD não definida.");
  console.error(
    "  Exemplo: SEED_PASSWORD=sua_senha npx tsx prisma/seed-production-users.ts",
  );
  process.exit(1);
}

const WORKING_DAYS = [1, 2, 3, 4, 5, 6];

const USERS = [
  {
    email: "ygor.dagger12@gmail.com",
    name: "Ygor Luan",
    avatarUrl: "/barbers/ygor.webp",
    role: UserRole.ADMIN,
    isBarber: true,
  },
  {
    email: "vitormmaronez@gmail.com",
    name: "Vitor Maronez",
    avatarUrl: "/barbers/vitor.webp",
    role: UserRole.ADMIN,
    isBarber: true,
  },
  {
    email: "joao.vittur@gmail.com",
    name: "João Vitor",
    avatarUrl: "/barbers/joao.webp",
    role: UserRole.BARBER,
    isBarber: true,
  },
  {
    email: "david.trindadew@gmail.com",
    name: "David Trindade",
    avatarUrl: "/barbers/david.webp",
    role: UserRole.BARBER,
    isBarber: true,
  },
];

async function getOrCreateAuthUser(email: string, name: string) {
  const { data: listData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

  if (listError) {
    throw new Error(`Erro ao listar usuários: ${listError.message}`);
  }

  const existing = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existing) {
    console.log(`  Auth user já existe: ${email} (${existing.id})`);
    return existing;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error) {
    throw new Error(`Erro ao criar usuário ${email}: ${error.message}`);
  }

  console.log(`  Auth user criado: ${email} (${data.user.id})`);
  return data.user;
}

async function getOrCreateProfile(
  userId: string,
  name: string,
  role: UserRole,
) {
  const existing = await prisma.profile.findUnique({ where: { userId } });

  if (existing) {
    const updated = await prisma.profile.update({
      where: { id: existing.id },
      data: { role, fullName: name },
    });
    console.log(`  Profile atualizado: role=${role}`);
    return updated;
  }

  const created = await prisma.profile.create({
    data: { userId, fullName: name, role },
  });
  console.log(`  Profile criado: role=${role}`);
  return created;
}

async function getOrCreateBarber(
  userId: string,
  name: string,
  avatarUrl: string,
) {
  const existing = await prisma.barber.findUnique({ where: { userId } });

  if (existing) {
    console.log(`  Barber já existe: ${name}`);
    return existing;
  }

  const created = await prisma.barber.create({
    data: { userId, name, avatarUrl, active: true },
  });
  console.log(`  Barber criado: ${name}`);
  return created;
}

async function getOrCreateWorkingHours(barberId: string) {
  const existing = await prisma.workingHours.findFirst({ where: { barberId } });

  if (existing) {
    console.log(`  Working hours já existem`);
    return;
  }

  for (const dayOfWeek of WORKING_DAYS) {
    await prisma.workingHours.create({
      data: {
        barberId,
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
    });
  }
  console.log(`  Working hours criados (Seg-Sáb 09:00-18:00)`);
}

async function linkAllServices(barberId: string) {
  const services = await prisma.service.findMany({ where: { active: true } });

  let linked = 0;
  for (const service of services) {
    const existing = await prisma.barberService.findFirst({
      where: { barberId, serviceId: service.id },
    });

    if (!existing) {
      await prisma.barberService.create({
        data: { barberId, serviceId: service.id },
      });
      linked++;
    }
  }

  if (linked > 0) {
    console.log(`  ${linked} serviço(s) vinculado(s)`);
  } else {
    console.log(`  Serviços já vinculados`);
  }
}

async function main() {
  console.log("Iniciando seed de usuários de produção...\n");

  for (const user of USERS) {
    console.log(`\n→ ${user.name} (${user.email})`);

    const authUser = await getOrCreateAuthUser(user.email, user.name);
    await getOrCreateProfile(authUser.id, user.name, user.role);

    if (user.isBarber) {
      const barber = await getOrCreateBarber(
        authUser.id,
        user.name,
        user.avatarUrl,
      );
      await getOrCreateWorkingHours(barber.id);
      await linkAllServices(barber.id);
    }
  }

  console.log("\nSeed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("\nErro durante o seed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
