import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedRewards() {
  console.log("🎁 Seeding rewards...");

  const rewards = [
    {
      name: "Corte de Cabelo Grátis",
      description:
        "Um corte de cabelo por conta da casa. Válido para qualquer barbeiro.",
      pointsCost: 1000,
      type: "FREE_SERVICE",
      value: null,
      serviceId: null,
      imageUrl:
        "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400&auto=format&fit=crop",
      active: true,
      stock: null, // ilimitado
    },
    {
      name: "Barba Desenhada",
      description:
        "Design de barba profissional com toalha quente e produtos premium.",
      pointsCost: 600,
      type: "FREE_SERVICE",
      value: null,
      serviceId: null,
      imageUrl:
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400&auto=format&fit=crop",
      active: true,
      stock: null,
    },
    {
      name: "Desconto 20%",
      description:
        "20% de desconto em qualquer produto da loja (produtos de cabelo, barba, etc.).",
      pointsCost: 400,
      type: "DISCOUNT",
      value: 20.0,
      serviceId: null,
      imageUrl: null,
      active: true,
      stock: 50, // limitado a 50 usos
    },
    {
      name: "10% OFF em Serviços",
      description:
        "10% de desconto no seu próximo agendamento (qualquer serviço).",
      pointsCost: 300,
      type: "DISCOUNT",
      value: 10.0,
      serviceId: null,
      imageUrl: null,
      active: true,
      stock: 100,
    },
    {
      name: "Pacote Completo",
      description:
        "Corte + Barba + Hidratação. O tratamento completo para você.",
      pointsCost: 1500,
      type: "FREE_SERVICE",
      value: null,
      serviceId: null,
      imageUrl:
        "https://images.unsplash.com/photo-1517831907240-6c4432dc6a79?q=80&w=400&auto=format&fit=crop",
      active: false, // inicialmente desativado
      stock: 20,
    },
  ];

  try {
    // Limpar rewards existentes (apenas em desenvolvimento)
    if (process.env.NODE_ENV === "development") {
      await prisma.reward.deleteMany();
      console.log("🗑️  Cleared existing rewards");
    }

    // Inserir novos rewards
    for (const [index, reward] of rewards.entries()) {
      await prisma.reward.upsert({
        where: {
          id: `reward-${index + 1}`, // ID determinístico para development
        },
        update: reward,
        create: {
          ...reward,
          id: `reward-${index + 1}`,
        },
      });
    }

    console.log(`✅ Successfully seeded ${rewards.length} rewards`);
  } catch (error) {
    console.error("❌ Error seeding rewards:", error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRewards()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
