import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createFeedback, getAppointmentFeedback } from "@/services/feedback";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { feedbackSchema } from "@/lib/validations/feedback";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/appointments/[id]/feedback
 * Get feedback for an appointment (if exists)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = await params;

    const appointmentIdValidation = z
      .string()
      .uuid("ID do agendamento inválido")
      .safeParse(appointmentId);

    if (!appointmentIdValidation.success) {
      return apiError(
        "INVALID_APPOINTMENT_ID",
        "ID do agendamento inválido",
        400,
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autenticado", 401);
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return apiError("PROFILE_NOT_FOUND", "Perfil não encontrado", 404);
    }

    // Verify appointment ownership
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return apiError(
        "APPOINTMENT_NOT_FOUND",
        "Agendamento não encontrado",
        404,
      );
    }

    if (appointment.clientId !== profile.id) {
      return apiError("UNAUTHORIZED", "Sem permissão", 403);
    }

    const feedback = await getAppointmentFeedback(appointmentId);

    return apiSuccess(feedback);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar avaliação");
  }
}

/**
 * POST /api/appointments/[id]/feedback
 * Create feedback for a completed appointment (authenticated client)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const { id: appointmentId } = await params;

    const appointmentIdValidation = z
      .string()
      .uuid("ID do agendamento inválido")
      .safeParse(appointmentId);

    if (!appointmentIdValidation.success) {
      return apiError(
        "INVALID_APPOINTMENT_ID",
        "ID do agendamento inválido",
        400,
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autenticado", 401);
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return apiError("PROFILE_NOT_FOUND", "Perfil não encontrado", 404);
    }

    const body = await request.json();
    const validation = feedbackSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const { rating, comment } = validation.data;

    const feedback = await createFeedback(
      { appointmentId, rating, comment },
      profile.id,
    );

    return apiSuccess(feedback, 201);
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
        return apiError(mapped.error, mapped.message, mapped.status);
      }
    }

    return handlePrismaError(error, "Erro ao criar avaliação");
  }
}
