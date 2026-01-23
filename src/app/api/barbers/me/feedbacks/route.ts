import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getBarberFeedbacks } from "@/services/feedback";

/**
 * GET /api/barbers/me/feedbacks
 * Get feedbacks for the authenticated barber
 */
export async function GET(request: NextRequest) {
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

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const result = await getBarberFeedbacks(barber.id, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching barber feedbacks:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar avaliações" },
      { status: 500 },
    );
  }
}
