import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { markAppointmentAsCompleted } from "@/services/booking";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const { id: appointmentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const rateLimitResult = await checkRateLimit(
      "api",
      getUserRateLimitIdentifier(user.id),
    );
    if (!rateLimitResult.success) {
      return apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
    }

    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
    });

    if (!barber) {
      return apiError(
        "FORBIDDEN",
        "Apenas barbeiros podem concluir agendamentos",
        403,
      );
    }

    const appointment = await markAppointmentAsCompleted(
      appointmentId,
      barber.id,
    );

    return apiSuccess(appointment);
  } catch (error) {
    if (error instanceof Error) {
      const domainErrors: Record<
        string,
        { status: number; error: string; message: string }
      > = {
        APPOINTMENT_NOT_FOUND: {
          status: 404,
          error: "NOT_FOUND",
          message: "Agendamento não encontrado",
        },
        UNAUTHORIZED: {
          status: 403,
          error: "FORBIDDEN",
          message: "Você não tem permissão para concluir este agendamento",
        },
        APPOINTMENT_NOT_MARKABLE: {
          status: 409,
          error: "CONFLICT",
          message: "Este agendamento não pode ser concluído (status inválido)",
        },
        APPOINTMENT_NOT_STARTED: {
          status: 412,
          error: "PRECONDITION_FAILED",
          message: "Só é possível concluir após o horário do agendamento",
        },
      };

      const mapped = domainErrors[error.message];
      if (mapped) {
        return apiError(mapped.error, mapped.message, mapped.status);
      }
    }

    return handlePrismaError(error, "Erro ao concluir agendamento");
  }
}
