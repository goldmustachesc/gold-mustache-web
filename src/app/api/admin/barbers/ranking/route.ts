import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
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

    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("Error fetching barber ranking:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar ranking" },
      { status: 500 },
    );
  }
}
