import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const { id } = await params;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const absence = await prisma.barberAbsence.findUnique({
      where: { id },
      select: { id: true, barberId: true },
    });

    if (!absence || absence.barberId !== auth.barberId) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Ausência não encontrada" },
        { status: 404 },
      );
    }

    await prisma.barberAbsence.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting barber absence:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao remover ausência" },
      { status: 500 },
    );
  }
}
