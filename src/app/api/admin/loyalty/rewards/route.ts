import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiError, apiSuccess } from "@/lib/api/response";
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

    return apiSuccess(formattedRewards);
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
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        validation.error.issues,
      );
    }

    const data = validation.data;

    // Validações de negócio
    if (data.type === "DISCOUNT" && (!data.value || data.value <= 0)) {
      return apiError(
        "VALIDATION_ERROR",
        "Descontos devem ter um valor positivo",
        400,
      );
    }

    if (data.type === "FREE_SERVICE" && data.serviceId) {
      // Verificar se o serviço existe
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId },
      });
      if (!service) {
        return apiError("NOT_FOUND", "Serviço não encontrado", 404);
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
    console.info(`[AUDIT] Reward ${newReward.id} created by admin`);

    return apiSuccess(
      {
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
      201,
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return apiError("VALIDATION_ERROR", "Dados inválidos", 400, error.issues);
    }
    return handlePrismaError(error, "Erro ao criar recompensa");
  }
}
