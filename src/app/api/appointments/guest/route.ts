import { apiSuccess, apiError } from "@/lib/api/response";
import { createGuestAppointment } from "@/services/booking";
import { createGuestAppointmentSchema } from "@/lib/validations/booking";
import { Prisma } from "@prisma/client";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import { resolveBookingMode } from "@/lib/booking-mode";
import { requireValidOrigin } from "@/lib/api/verify-origin";

export async function POST(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const settings = await getBarbershopSettings();
    const mode = resolveBookingMode(settings);
    if (mode !== "internal") {
      return apiError(
        "BOOKING_DISABLED",
        "Agendamento interno indisponível no momento.",
        403,
      );
    }

    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("guestAppointments", clientId);
    if (!rateLimitResult.success) {
      const res = apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
      res.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining),
      );
      res.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset));
      return res;
    }

    const body = await request.json();

    // Validate input
    const validation = createGuestAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    // Create appointment for guest (returns appointment + accessToken)
    const { appointment, accessToken } = await createGuestAppointment(
      validation.data,
    );

    // Return both the appointment and the access token for localStorage
    return apiSuccess({ appointment, accessToken }, 201);
  } catch (error) {
    if (error instanceof Error) {
      const domainErrors: Record<
        string,
        { status: number; error: string; message: string }
      > = {
        CLIENT_BANNED: {
          status: 403,
          error: "CLIENT_BANNED",
          message:
            "Sua conta foi suspensa. Entre em contato com a barbearia para mais informações.",
        },
        SLOT_IN_PAST: {
          status: 400,
          error: "SLOT_IN_PAST",
          message: "Não é possível agendar em horários que já passaram",
        },
        SLOT_TOO_SOON: {
          status: 400,
          error: "SLOT_TOO_SOON",
          message:
            "Agendamento deve ser feito com pelo menos 60 minutos de antecedência",
        },
        SHOP_CLOSED: {
          status: 400,
          error: "SHOP_CLOSED",
          message: "A barbearia não atende neste horário",
        },
        BARBER_UNAVAILABLE: {
          status: 400,
          error: "BARBER_UNAVAILABLE",
          message: "Este barbeiro não atende neste horário",
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
        CLIENT_OVERLAPPING_APPOINTMENT: {
          status: 409,
          error: "CLIENT_OVERLAPPING_APPOINTMENT",
          message: "Você já possui um agendamento neste horário",
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
