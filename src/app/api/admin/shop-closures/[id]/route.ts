import { apiMessage, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { deleteShopClosure } from "@/services/shop-closure";

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
    const deleted = await deleteShopClosure(id);
    if (!deleted) {
      return apiError("NOT_FOUND", "Fechamento não encontrado", 404);
    }

    return apiMessage();
  } catch (error) {
    return handlePrismaError(error, "Erro ao remover fechamento");
  }
}
