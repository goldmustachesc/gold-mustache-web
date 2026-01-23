import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createFeedback, getAppointmentFeedback } from "@/services/feedback";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/appointments/[id]/feedback
 * Get feedback for an appointment (if exists)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = await params;

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

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "PROFILE_NOT_FOUND", message: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    // Verify appointment ownership
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json(
        {
          error: "APPOINTMENT_NOT_FOUND",
          message: "Agendamento não encontrado",
        },
        { status: 404 },
      );
    }

    if (appointment.clientId !== profile.id) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Sem permissão" },
        { status: 403 },
      );
    }

    const feedback = await getAppointmentFeedback(appointmentId);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar avaliação" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/appointments/[id]/feedback
 * Create feedback for a completed appointment (authenticated client)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = await params;

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

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "PROFILE_NOT_FOUND", message: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || typeof rating !== "number") {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Avaliação é obrigatória" },
        { status: 400 },
      );
    }

    const feedback = await createFeedback(
      { appointmentId, rating, comment },
      profile.id,
    );

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error("Error creating feedback:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    const errorMap: Record<string, { status: number; message: string }> = {
      INVALID_RATING: { status: 400, message: "Avaliação deve ser de 1 a 5" },
      APPOINTMENT_NOT_FOUND: {
        status: 404,
        message: "Agendamento não encontrado",
      },
      UNAUTHORIZED: { status: 403, message: "Sem permissão" },
      APPOINTMENT_NOT_COMPLETED: {
        status: 400,
        message: "Apenas agendamentos concluídos podem ser avaliados",
      },
      FEEDBACK_ALREADY_EXISTS: {
        status: 409,
        message: "Este agendamento já foi avaliado",
      },
    };

    const mapped = errorMap[errorMessage];
    if (mapped) {
      return NextResponse.json(
        { error: errorMessage, message: mapped.message },
        { status: mapped.status },
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao criar avaliação" },
      { status: 500 },
    );
  }
}
