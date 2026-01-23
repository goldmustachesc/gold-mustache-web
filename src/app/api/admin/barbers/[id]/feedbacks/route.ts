import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
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
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Barbeiro não encontrado" },
        { status: 404 },
      );
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

    return NextResponse.json({
      barber,
      ...feedbacksResult,
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error("Error fetching barber feedbacks:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Erro ao buscar avaliações do barbeiro",
      },
      { status: 500 },
    );
  }
}
