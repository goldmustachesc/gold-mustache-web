import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

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
    return handlePrismaError(error, "Erro ao remover fechamento");
  }
}
