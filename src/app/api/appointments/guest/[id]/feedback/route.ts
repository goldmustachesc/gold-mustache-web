import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createGuestFeedback,
  getAppointmentFeedback,
} from "@/services/feedback";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { feedbackSchema } from "@/lib/validations/feedback";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/appointments/guest/[id]/feedback
 * Get feedback for a guest appointment (if exists)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("guestAppointments", clientId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Muitas requisições. Tente novamente em 1 minuto.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.reset),
          },
        },
      );
    }

    const { id: appointmentId } = await params;

    const appointmentIdValidation = z
      .string()
      .uuid("ID do agendamento inválido")
      .safeParse(appointmentId);

    if (!appointmentIdValidation.success) {
      return NextResponse.json(
        {
          error: "INVALID_APPOINTMENT_ID",
          message: "ID do agendamento inválido",
        },
        { status: 400 },
      );
    }

    // Get access token from header
    const accessToken = request.headers.get("x-guest-token");

    if (!accessToken) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Token não fornecido" },
        { status: 401 },
      );
    }

    // Find guest by token
    const guestClient = await prisma.guestClient.findUnique({
      where: { accessToken },
    });

    if (!guestClient) {
      return NextResponse.json(
        { error: "GUEST_NOT_FOUND", message: "Cliente não encontrado" },
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

    if (appointment.guestClientId !== guestClient.id) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Sem permissão" },
        { status: 403 },
      );
    }

    const feedback = await getAppointmentFeedback(appointmentId);

    return NextResponse.json({ feedback });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar avaliação");
  }
}

/**
 * POST /api/appointments/guest/[id]/feedback
 * Create feedback for a completed appointment (guest client)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("guestAppointments", clientId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Muitas requisições. Tente novamente em 1 minuto.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.reset),
          },
        },
      );
    }

    const { id: appointmentId } = await params;

    const appointmentIdValidation = z
      .string()
      .uuid("ID do agendamento inválido")
      .safeParse(appointmentId);

    if (!appointmentIdValidation.success) {
      return NextResponse.json(
        {
          error: "INVALID_APPOINTMENT_ID",
          message: "ID do agendamento inválido",
        },
        { status: 400 },
      );
    }

    // Get access token from header
    const accessToken = request.headers.get("x-guest-token");

    if (!accessToken) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Token não fornecido" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validation = feedbackSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { rating, comment } = validation.data;

    const feedback = await createGuestFeedback(
      { appointmentId, rating, comment },
      accessToken,
    );

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const errorMap: Record<
        string,
        { status: number; error: string; message: string }
      > = {
        INVALID_RATING: {
          status: 400,
          error: "INVALID_RATING",
          message: "Avaliação deve ser de 1 a 5",
        },
        GUEST_NOT_FOUND: {
          status: 404,
          error: "GUEST_NOT_FOUND",
          message: "Cliente não encontrado",
        },
        APPOINTMENT_NOT_FOUND: {
          status: 404,
          error: "APPOINTMENT_NOT_FOUND",
          message: "Agendamento não encontrado",
        },
        UNAUTHORIZED: {
          status: 403,
          error: "UNAUTHORIZED",
          message: "Sem permissão",
        },
        APPOINTMENT_NOT_COMPLETED: {
          status: 400,
          error: "APPOINTMENT_NOT_COMPLETED",
          message: "Apenas agendamentos concluídos podem ser avaliados",
        },
        FEEDBACK_ALREADY_EXISTS: {
          status: 409,
          error: "FEEDBACK_ALREADY_EXISTS",
          message: "Este agendamento já foi avaliado",
        },
      };

      const mapped = errorMap[error.message];
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error, message: mapped.message },
          { status: mapped.status },
        );
      }
    }

    return handlePrismaError(error, "Erro ao criar avaliação");
  }
}
