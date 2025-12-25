import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_BARBER", message: "Usuário não é barbeiro" },
        { status: 404 },
      );
    }

    const absence = await prisma.barberAbsence.findUnique({
      where: { id },
      select: { id: true, barberId: true },
    });

    if (!absence || absence.barberId !== barber.id) {
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
