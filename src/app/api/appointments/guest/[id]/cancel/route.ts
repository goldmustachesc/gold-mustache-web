import { NextResponse } from "next/server";
import { cancelAppointmentByGuestToken } from "@/services/booking";
import { notifyBarberOfAppointmentCancelledByClient } from "@/services/notification";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

/**
 * PATCH /api/appointments/guest/[id]/cancel
 * Cancels a guest appointment using the X-Guest-Token header for authentication.
 * This is more secure than the old phone-based cancellation.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const accessToken = request.headers.get("X-Guest-Token");

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "MISSING_TOKEN",
          message: "Token de acesso não fornecido",
        },
        { status: 401 },
      );
    }

    const appointment = await cancelAppointmentByGuestToken(id, accessToken);

    await notifyBarberOfAppointmentCancelledByClient(appointment);

    return NextResponse.json({ appointment });
  } catch (error) {
    if (error instanceof Error) {
      const domainErrors: Record<
        string,
        { status: number; error: string; message: string }
      > = {
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
          message: "Você não tem permissão para cancelar este agendamento",
        },
        APPOINTMENT_NOT_CANCELLABLE: {
          status: 400,
          error: "APPOINTMENT_NOT_CANCELLABLE",
          message: "Este agendamento não pode ser cancelado",
        },
        APPOINTMENT_IN_PAST: {
          status: 400,
          error: "APPOINTMENT_IN_PAST",
          message: "Este agendamento já passou e não pode ser cancelado",
        },
      };

      const mapped = domainErrors[error.message];
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error, message: mapped.message },
          { status: mapped.status },
        );
      }
    }

    return handlePrismaError(error, "Erro ao cancelar agendamento");
  }
}
