import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getBarberFeedbackStats } from "@/services/feedback";

/**
 * GET /api/barbers/me/feedbacks/stats
 * Get feedback stats for the authenticated barber
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autenticado" },
        { status: 401 },
      );
    }

    // Find barber by userId
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Usuário não é barbeiro" },
        { status: 404 },
      );
    }

    const stats = await getBarberFeedbackStats(barber.id);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching barber feedback stats:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar estatísticas" },
      { status: 500 },
    );
  }
}
