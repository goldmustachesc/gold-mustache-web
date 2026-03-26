import { apiSuccess } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getBarberRanking } from "@/services/feedback";

/**
 * GET /api/admin/barbers/ranking
 * Get barber ranking by average rating (admin only)
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const ranking = await getBarberRanking();

    return apiSuccess(ranking);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar ranking");
  }
}
