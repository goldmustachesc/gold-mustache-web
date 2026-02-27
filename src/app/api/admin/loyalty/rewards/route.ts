import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { z } from "zod";

// Schema para validação de criação de reward
const createRewardSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z.string().optional(),
  pointsCost: z.number().int().min(1, "Custo em pontos deve ser positivo"),
  type: z.enum(["DISCOUNT", "FREE_SERVICE", "PRODUCT"]),
  value: z.number().optional(),
  serviceId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  stock: z.number().int().positive().optional(),
  active: z.boolean().default(true),
});

// GET - Listar todos os rewards (incluindo inativos para admin)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const rewards = await prisma.reward.findMany({
      orderBy: [
        { active: "desc" }, // Ativos primeiro
        { pointsCost: "asc" }, // Do mais barato ao mais caro
      ],
      include: {
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
    });

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
      totalRedemptions: reward._count.redemptions,
      createdAt: reward.createdAt,
      updatedAt: reward.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      rewards: formattedRewards,
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar recompensas");
  }
}

// POST - Criar novo reward
export async function POST(req: Request) {
  const originError = requireValidOrigin(req);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await req.json();

    // Validar o request body
    const validation = createRewardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Validações de negócio
    if (data.type === "DISCOUNT" && (!data.value || data.value <= 0)) {
      return NextResponse.json(
        { error: "Descontos devem ter um valor positivo" },
        { status: 400 },
      );
    }

    if (data.type === "FREE_SERVICE" && data.serviceId) {
      // Verificar se o serviço existe
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId },
      });
      if (!service) {
        return NextResponse.json(
          { error: "Serviço não encontrado" },
          { status: 404 },
        );
      }
    }

    // Criar o reward
    const newReward = await prisma.reward.create({
      data: {
        name: data.name,
        description: data.description,
        pointsCost: data.pointsCost,
        type: data.type,
        value: data.value,
        serviceId: data.serviceId,
        imageUrl: data.imageUrl || null,
        stock: data.stock,
        active: data.active,
      },
    });

    // Log de auditoria
    console.log(`[AUDIT] Reward ${newReward.id} created by admin`);

    return NextResponse.json(
      {
        success: true,
        message: "Recompensa criada com sucesso",
        data: {
          id: newReward.id,
          name: newReward.name,
          description: newReward.description,
          costInPoints: newReward.pointsCost,
          type: newReward.type,
          value: newReward.value,
          serviceId: newReward.serviceId,
          imageUrl: newReward.imageUrl,
          active: newReward.active,
          stock: newReward.stock,
          createdAt: newReward.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.issues,
        },
        { status: 400 },
      );
    }
    return handlePrismaError(error, "Erro ao criar recompensa");
  }
}
