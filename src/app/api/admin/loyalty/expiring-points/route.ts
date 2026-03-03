import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiCollection } from "@/lib/api/response";
import { ExpirationService } from "@/services/loyalty/expiration.service";

export async function GET(req: Request) {
  const originError = requireValidOrigin(req);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const transactions = await ExpirationService.getExpiringTransactions();

    return apiCollection(transactions);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar pontos prestes a expirar");
  }
}
