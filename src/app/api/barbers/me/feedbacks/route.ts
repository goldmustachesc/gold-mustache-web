import type { NextRequest } from "next/server";
import { getBarberFeedbacks } from "@/services/feedback";
import { apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { parsePagination } from "@/lib/api/pagination";
import { requireBarber } from "@/lib/auth/requireBarber";

/**
 * GET /api/barbers/me/feedbacks
 * Get feedbacks for the authenticated barber
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit } = parsePagination(searchParams);

    const result = await getBarberFeedbacks(auth.barberId, page, limit);

    return apiSuccess(result);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar avaliações");
  }
}
