import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
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

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching admin feedback stats:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar estatísticas" },
      { status: 500 },
    );
  }
}
