import { PrismaClient, UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// Passa o email como argumento: npx tsx prisma/seed-admin.ts "email@exemplo.com"
const TARGET_EMAIL = process.argv[2];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variáveis de ambiente não configuradas:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error("Erro ao buscar usuários:", error.message);
    process.exit(1);
  }

  if (!authUsers.users.length) {
    console.error("Nenhum usuário encontrado no Supabase Auth.");
    process.exit(1);
  }

  if (!TARGET_EMAIL) {
    process.exit(0);
  }

  const targetUser = authUsers.users.find(
    (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase(),
  );

  if (!targetUser) {
    console.error(`\n❌ Usuário com email "${TARGET_EMAIL}" não encontrado.\n`);
    process.exit(1);
  }

  let profile = await prisma.profile.findUnique({
    where: { userId: targetUser.id },
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: targetUser.id,
        fullName:
          targetUser.user_metadata?.name ||
          targetUser.user_metadata?.full_name ||
          targetUser.email?.split("@")[0],
        phone: (targetUser.user_metadata?.phone as string | undefined) || null,
      },
    });
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: { role: UserRole.ADMIN },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
