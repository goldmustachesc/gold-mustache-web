import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
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
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Barbeiro não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ barber });
  } catch (error) {
    console.error("Error fetching barber:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar barbeiro" },
      { status: 500 },
    );
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
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBarberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const existingBarber = await prisma.barber.findUnique({
      where: { id },
    });

    if (!existingBarber) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Barbeiro não encontrado" },
        { status: 404 },
      );
    }

    const barber = await prisma.barber.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ barber });
  } catch (error) {
    console.error("Error updating barber:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao atualizar barbeiro" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/barbers/[id]
 * Remove um barbeiro (soft delete - apenas desativa)
 * Ou hard delete se não tiver agendamentos
 */
export async function DELETE(
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
          },
        },
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Barbeiro não encontrado" },
        { status: 404 },
      );
    }

    // Se tem agendamentos, apenas desativa (soft delete)
    if (barber._count.appointments > 0) {
      await prisma.barber.update({
        where: { id },
        data: { active: false },
      });

      return NextResponse.json({
        success: true,
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

    return NextResponse.json({
      success: true,
      softDelete: false,
      message: "Barbeiro removido com sucesso",
    });
  } catch (error) {
    console.error("Error deleting barber:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao remover barbeiro" },
      { status: 500 },
    );
  }
}
