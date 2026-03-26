import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { z } from "zod";

const updateBarberSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100)
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
  active: z.boolean().optional(),
});

export type UpdateBarberInput = z.infer<typeof updateBarberSchema>;

/**
 * GET /api/admin/barbers/[id]
 * Retorna detalhes de um barbeiro específico
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { id } = await params;

    const barber = await prisma.barber.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appointments: true,
            workingHours: true,
          },
        },
      },
    });

    if (!barber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    return apiSuccess(barber);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar barbeiro");
  }
}

/**
 * PUT /api/admin/barbers/[id]
 * Atualiza um barbeiro
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBarberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        parsed.error.flatten(),
      );
    }

    const existingBarber = await prisma.barber.findUnique({
      where: { id },
    });

    if (!existingBarber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    const barber = await prisma.barber.update({
      where: { id },
      data: parsed.data,
    });

    return apiSuccess(barber);
  } catch (error) {
    return handlePrismaError(error, "Erro ao atualizar barbeiro");
  }
}

/**
 * DELETE /api/admin/barbers/[id]
 * Remove um barbeiro (soft delete - apenas desativa)
 * Ou hard delete se não tiver agendamentos
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { id } = await params;

    const barber = await prisma.barber.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!barber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    // Se tem agendamentos, apenas desativa (soft delete)
    if (barber._count.appointments > 0) {
      await prisma.barber.update({
        where: { id },
        data: { active: false },
      });

      return apiSuccess({
        softDelete: true,
        message:
          "Barbeiro desativado (mantido no histórico devido aos agendamentos)",
      });
    }

    // Se não tem agendamentos, pode remover completamente
    // Primeiro remove os dados relacionados
    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { barberId: id } }),
      prisma.barberService.deleteMany({ where: { barberId: id } }),
      prisma.barberAbsence.deleteMany({ where: { barberId: id } }),
      prisma.barber.delete({ where: { id } }),
    ]);

    return apiSuccess({
      softDelete: false,
      message: "Barbeiro removido com sucesso",
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao remover barbeiro");
  }
}
