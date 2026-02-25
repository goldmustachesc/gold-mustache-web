import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { z } from "zod";

// Schema para validação de atualização de reward (todos campos opcionais)
const updateRewardSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  description: z.string().optional(),
  pointsCost: z
    .number()
    .int()
    .min(1, "Custo em pontos deve ser positivo")
    .optional(),
  type: z.enum(["DISCOUNT", "FREE_SERVICE", "PRODUCT"]).optional(),
  value: z.number().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  stock: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
});

// GET - Obter um reward específico
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;

    const reward = await prisma.reward.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            redemptions: {
              where: {
                usedAt: null,
                expiresAt: {
                  gt: new Date(),
                },
              },
            },
          },
        },
      },
    });

    if (!reward) {
      return NextResponse.json(
        { error: "Recompensa não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        costInPoints: reward.pointsCost,
        type: reward.type,
        value: reward.value,
        serviceId: reward.serviceId,
        imageUrl: reward.imageUrl,
        active: reward.active,
        stock: reward.stock,
        activeRedemptions: reward._count.redemptions,
        createdAt: reward.createdAt,
        updatedAt: reward.updatedAt,
      },
    });
  } catch (error) {
    console.error("[ADMIN_REWARD_GET]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// PUT - Atualizar um reward existente
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const body = await req.json();

    // Validar o request body
    const validation = updateRewardSchema.safeParse(body);
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

    // Verificar se o reward existe
    const existingReward = await prisma.reward.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            redemptions: {
              where: {
                usedAt: null,
                expiresAt: {
                  gt: new Date(),
                },
              },
            },
          },
        },
      },
    });

    if (!existingReward) {
      return NextResponse.json(
        { error: "Recompensa não encontrada" },
        { status: 404 },
      );
    }

    // Validações de negócio
    if (
      data.type === "DISCOUNT" &&
      data.value !== undefined &&
      data.value <= 0
    ) {
      return NextResponse.json(
        { error: "Descontos devem ter um valor positivo" },
        { status: 400 },
      );
    }

    if (data.serviceId) {
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

    // Regra: não permitir desativar se tiver resgates ativos
    if (data.active === false && existingReward._count.redemptions > 0) {
      return NextResponse.json(
        {
          error: "Não é possível desativar esta recompensa",
          details: `Existem ${existingReward._count.redemptions} resgates ativos pendentes`,
        },
        { status: 409 },
      );
    }

    // Atualizar o reward
    const updatedReward = await prisma.reward.update({
      where: { id },
      data: {
        ...data,
        imageUrl: data.imageUrl === "" ? null : data.imageUrl,
        updatedAt: new Date(),
      },
    });

    // Log de auditoria
    console.log(`[AUDIT] Reward ${id} updated by admin`);

    return NextResponse.json({
      success: true,
      message: "Recompensa atualizada com sucesso",
      data: {
        id: updatedReward.id,
        name: updatedReward.name,
        description: updatedReward.description,
        costInPoints: updatedReward.pointsCost,
        type: updatedReward.type,
        value: updatedReward.value,
        serviceId: updatedReward.serviceId,
        imageUrl: updatedReward.imageUrl,
        active: updatedReward.active,
        stock: updatedReward.stock,
        updatedAt: updatedReward.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("[ADMIN_REWARD_PUT]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Recompensa não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// DELETE - Remover um reward
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;

    // Verificar se o reward existe e se pode ser deletado
    const existingReward = await prisma.reward.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
    });

    if (!existingReward) {
      return NextResponse.json(
        { error: "Recompensa não encontrada" },
        { status: 404 },
      );
    }

    // Não permitir deletar se tiver resgates (mesmo que expirados)
    if (existingReward._count.redemptions > 0) {
      return NextResponse.json(
        {
          error: "Não é possível remover esta recompensa",
          details: `Existem ${existingReward._count.redemptions} resgates associados`,
        },
        { status: 409 },
      );
    }

    // Deletar o reward
    await prisma.reward.delete({
      where: { id },
    });

    // Log de auditoria
    console.log(`[AUDIT] Reward ${id} deleted by admin`);

    return NextResponse.json({
      success: true,
      message: "Recompensa removida com sucesso",
    });
  } catch (error: unknown) {
    console.error("[ADMIN_REWARD_DELETE]", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Recompensa não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
