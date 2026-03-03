import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { apiSuccess } from "@/lib/api/response";
import { ExpirationService } from "@/services/loyalty/expiration.service";

export async function POST(req: Request) {
  const originError = requireValidOrigin(req);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const result = await ExpirationService.expirePoints();

    return apiSuccess(result);
  } catch (error) {
    return handlePrismaError(error, "Erro ao expirar pontos de fidelidade");
  }
}
