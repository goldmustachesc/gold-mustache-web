import { NextResponse } from "next/server";
import { getBarberFeedbackStats } from "@/services/feedback";
import { requireBarber } from "@/lib/auth/requireBarber";

/**
 * GET /api/barbers/me/feedbacks/stats
 * Get feedback stats for the authenticated barber
 */
export async function GET() {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const stats = await getBarberFeedbackStats(auth.barberId);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching barber feedback stats:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar estatísticas" },
      { status: 500 },
    );
  }
}
