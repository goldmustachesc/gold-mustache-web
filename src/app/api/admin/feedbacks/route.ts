import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { parsePagination } from "@/lib/api/pagination";
import { getAllFeedbacks } from "@/services/feedback";
import type { FeedbackFilters } from "@/types/feedback";

/**
 * GET /api/admin/feedbacks
 * Get all feedbacks with filters (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit } = parsePagination(searchParams);

    // Filters
    const filters: FeedbackFilters = {};

    const barberId = searchParams.get("barberId");
    if (barberId) filters.barberId = barberId;

    const rating = searchParams.get("rating");
    if (rating) filters.rating = parseInt(rating, 10);

    const startDate = searchParams.get("startDate");
    if (startDate) filters.startDate = startDate;

    const endDate = searchParams.get("endDate");
    if (endDate) filters.endDate = endDate;

    const hasComment = searchParams.get("hasComment");
    if (hasComment !== null) {
      filters.hasComment = hasComment === "true";
    }

    const result = await getAllFeedbacks(filters, page, limit);

    return apiSuccess(result);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar avaliações");
  }
}
