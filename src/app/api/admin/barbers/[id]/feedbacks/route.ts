import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import {
  getBarberFeedbacksAdmin,
  getBarberFeedbackStats,
} from "@/services/feedback";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/barbers/[id]/feedbacks
 * Get feedbacks for a specific barber (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id: barberId } = await params;

    // Verify barber exists
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: { id: true, name: true },
    });

    if (!barber) {
      return apiError("NOT_FOUND", "Barbeiro não encontrado", 404);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const includeStats = searchParams.get("includeStats") === "true";

    const feedbacksResult = await getBarberFeedbacksAdmin(
      barberId,
      page,
      pageSize,
    );

    // Optionally include stats
    let stats = null;
    if (includeStats) {
      stats = await getBarberFeedbackStats(barberId);
    }

    return apiSuccess({
      barber,
      ...feedbacksResult,
      ...(stats && { stats }),
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar avaliações do barbeiro");
  }
}
