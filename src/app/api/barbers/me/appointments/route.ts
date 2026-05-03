import { createAppointmentByBarber } from "@/services/booking";
import { apiError, apiSuccess } from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { notifyGuestAppointmentConfirmed } from "@/services/notification";
import { createAppointmentByBarberSchema } from "@/lib/validations/booking";
import { Prisma } from "@prisma/client";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const rateLimitResult = await checkRateLimit(
      "appointments",
      getUserRateLimitIdentifier(auth.userId),
    );
    if (!rateLimitResult.success) {
      return apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
    }

    const body = await request.json();

    const validation = createAppointmentByBarberSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const appointment = await createAppointmentByBarber(
      validation.data,
      auth.barberId,
    );

    if (appointment.guestClient) {
      await notifyGuestAppointmentConfirmed(
        appointment.guestClient.phone,
        appointment.guestClient.fullName,
        auth.userId,
        {
          serviceName: appointment.service.name,
          barberName: appointment.barber.name,
          date: appointment.date,
          time: appointment.startTime,
        },
      ).catch((error) => {
        logger.warn(
          {
            error,
            appointmentId: appointment.id,
            barberUserId: auth.userId,
          },
          "Falha ao criar notificação de confirmação para guest",
        );
      });
    }

    return apiSuccess(appointment, 201);
  } catch (error) {
    if (error instanceof Error) {
      const domainErrors: Record<
        string,
        { status: number; error: string; message: string }
      > = {
        CLIENT_BANNED: {
          status: 403,
          error: "CLIENT_BANNED",
          message: "Este cliente está banido e não pode agendar.",
        },
        SLOT_IN_PAST: {
          status: 400,
          error: "SLOT_IN_PAST",
          message: "Não é possível agendar em horários que já passaram",
        },
        SHOP_CLOSED: {
          status: 400,
          error: "SHOP_CLOSED",
          message: "A barbearia não atende neste horário",
        },
        BARBER_UNAVAILABLE: {
          status: 400,
          error: "BARBER_UNAVAILABLE",
          message: "Você não atende neste horário",
        },
        SLOT_UNAVAILABLE: {
          status: 400,
          error: "SLOT_UNAVAILABLE",
          message: "Este horário não está disponível para agendamento",
        },
        SLOT_OCCUPIED: {
          status: 409,
          error: "SLOT_OCCUPIED",
          message: "Este horário já está ocupado",
        },
      };

      const mapped = domainErrors[error.message];
      if (mapped) {
        return apiError(mapped.error, mapped.message, mapped.status);
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("SLOT_OCCUPIED", "Este horário já está ocupado", 409);
    }

    return handlePrismaError(error, "Erro ao criar agendamento");
  }
}
