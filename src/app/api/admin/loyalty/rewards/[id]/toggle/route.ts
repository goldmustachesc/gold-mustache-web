import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { z } from "zod";

// Schema para validação do request body
const toggleSchema = z.object({
  active: z.boolean(),
});

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
    console.error(`[LOYALTY_REWARD_TOGGLE_PUT]`, error);

    // Tratamento específico para erros do Prisma
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Recompensa não encontrada no banco de dados." },
        { status: 404 },
      );
    }

    // Erro de validação do Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: "Não foi possível processar a solicitação",
      },
      { status: 500 },
    );
  }
}
