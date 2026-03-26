import { requireAdmin } from "@/lib/auth/requireAdmin";
import { apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getOverallFeedbackStats } from "@/services/feedback";

/**
 * GET /api/admin/feedbacks/stats
 * Get overall feedback stats (admin only)
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const stats = await getOverallFeedbackStats();

    return apiSuccess(stats);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar estatísticas");
  }
}
