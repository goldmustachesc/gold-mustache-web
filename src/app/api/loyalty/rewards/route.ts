import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rewards = await prisma.reward.findMany({
      where: {
        active: true, // Apenas rewards ativos para o público geral
      },
      orderBy: {
        pointsCost: "asc", // Ordenar do mais barato ao mais caro
      },
      select: {
        id: true,
        name: true,
        description: true,
        pointsCost: true,
        type: true,
        value: true,
        serviceId: true,
        imageUrl: true,
        active: true,
        stock: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transformar para o formato esperado pelo frontend
    const formattedRewards = rewards.map((reward) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      costInPoints: reward.pointsCost,
      imageUrl: reward.imageUrl,
      active: reward.active,
      type: reward.type,
      value: reward.value,
      stock: reward.stock,
    }));

    return NextResponse.json({
      success: true,
      rewards: formattedRewards,
    });
  } catch (error) {
    console.error("[LOYALTY_REWARDS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
