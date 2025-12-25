import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const existing = await prisma.shopClosure.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Fechamento não encontrado" },
        { status: 404 },
      );
    }

    await prisma.shopClosure.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting shop closure:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao remover fechamento" },
      { status: 500 },
    );
  }
}
