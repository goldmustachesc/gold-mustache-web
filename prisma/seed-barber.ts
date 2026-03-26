import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// Passa o email como argumento: npx tsx prisma/seed-barber.ts "email@exemplo.com"
const TARGET_EMAIL = process.argv[2];

// Usa a Service Role Key para ter acesso admin aos usuários
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
  // Busca todos os usuários do Supabase Auth
  const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error("Erro ao buscar usuários:", error.message);
    console.error(
      "\n⚠️  Certifique-se de ter SUPABASE_SERVICE_ROLE_KEY no .env",
    );
    console.error(
      "   Você encontra no Supabase Dashboard → Settings → API → service_role key\n",
    );
    process.exit(1);
  }

  if (!authUsers.users.length) {
    console.error("Nenhum usuário encontrado no Supabase Auth.");
    console.error("Faça login no app primeiro para criar seu usuário.");
    process.exit(1);
  }

  // Se não passou email, mostra instruções
  if (!TARGET_EMAIL) {
    process.exit(0);
  }

  // Busca o usuário pelo email
  const targetUser = authUsers.users.find(
    (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase(),
  );

  if (!targetUser) {
    console.error(`\n❌ Usuário com email "${TARGET_EMAIL}" não encontrado.\n`);
    process.exit(1);
  }

  // Verifica se já existe como barbeiro
  const existing = await prisma.barber.findUnique({
    where: { userId: targetUser.id },
  });

  if (existing) {
    console.error("Barbeiro já cadastrado:", existing);
    return;
  }

  // Cria o barbeiro
  const barber = await prisma.barber.create({
    data: {
      userId: targetUser.id,
      name:
        targetUser.user_metadata?.name ||
        targetUser.email?.split("@")[0] ||
        "Barbeiro",
      active: true,
    },
  });

  // Criar horários de trabalho (Segunda a Sábado, 9h-18h)
  const workingDays = [1, 2, 3, 4, 5, 6]; // Seg-Sáb

  for (const dayOfWeek of workingDays) {
    await prisma.workingHours.create({
      data: {
        barberId: barber.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
    });
  }

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
    // Verifica se o serviço já existe pelo slug
    let serviceRecord = await prisma.service.findUnique({
      where: { slug: service.slug },
    });

    if (!serviceRecord) {
      serviceRecord = await prisma.service.create({
        data: service,
      });
    }

    // Verifica se já está associado ao barbeiro
    const existingLink = await prisma.barberService.findFirst({
      where: { barberId: barber.id, serviceId: serviceRecord.id },
    });

    if (!existingLink) {
      await prisma.barberService.create({
        data: {
          barberId: barber.id,
          serviceId: serviceRecord.id,
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
