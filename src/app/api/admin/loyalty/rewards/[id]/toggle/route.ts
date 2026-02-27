import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { z } from "zod";

// Schema para validação do request body
const toggleSchema = z.object({
  active: z.boolean(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = requireValidOrigin(req);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const body = await req.json();

    // Validar o request body
    const validation = toggleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { active } = validation.data;

    // Verificar se o reward existe
    const existingReward = await prisma.reward.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            redemptions: {
              where: {
                usedAt: null, // Resgates não utilizados ainda
                expiresAt: {
                  gt: new Date(), // Que ainda não expiraram
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

    // Regras de negócio para desativar
    if (!active && existingReward._count.redemptions > 0) {
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
        active,
        updatedAt: new Date(),
      },
    });

    // Log de auditoria (poderia ser salvo em uma tabela de auditoria)
    console.log(
      `[AUDIT] Reward ${id} toggled to ${active ? "ACTIVE" : "INACTIVE"} by admin`,
    );

    return NextResponse.json({
      success: true,
      message: `Recompensa ${updatedReward.name} ${active ? "ativada" : "desativada"} com sucesso`,
      data: {
        id: updatedReward.id,
        name: updatedReward.name,
        active: updatedReward.active,
        updatedAt: updatedReward.updatedAt,
      },
    });
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
    return handlePrismaError(error, "Erro ao alterar status da recompensa");
  }
}
