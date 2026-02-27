import { type NextRequest, NextResponse } from "next/server";
import { getBarberFeedbacks } from "@/services/feedback";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const result = await getBarberFeedbacks(auth.barberId, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar avaliações");
  }
}
