import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import {
  createAppointment,
  getClientAppointments,
  getBarberAppointments,
} from "@/services/booking";
import { notifyAppointmentConfirmed } from "@/services/notification";
import {
  createAppointmentSchema,
  getAppointmentsQuerySchema,
} from "@/lib/validations/booking";
import { prisma } from "@/lib/prisma";
import { parseDateStringToUTC, getTodayUTCMidnight } from "@/utils/time-slots";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { Prisma } from "@prisma/client";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import { resolveBookingMode } from "@/lib/booking-mode";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { API_CONFIG } from "@/config/api";
import { normalizePhoneOrNull } from "@/lib/booking/phone";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = getAppointmentsQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      barberId: searchParams.get("barberId") ?? undefined,
    });

    if (!queryValidation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        queryValidation.error.flatten().fieldErrors,
      );
    }

    const { startDate, endDate, barberId } = queryValidation.data;

    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (barber && barberId === barber.id) {
      // Barber viewing their own appointments
      // Use parseDateStringToUTC for database queries against @db.Date fields
      // which store dates at UTC 00:00:00
      const dateRange = {
        start: startDate
          ? parseDateStringToUTC(startDate)
          : getTodayUTCMidnight(),
        end: endDate
          ? parseDateStringToUTC(endDate)
          : new Date(
              getTodayUTCMidnight().getTime() +
                API_CONFIG.appointments.defaultRangeMs,
            ),
      };

      const appointments = await getBarberAppointments(barber.id, dateRange);
      const response = apiSuccess(appointments);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    // Client viewing their appointments - get or create profile
    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          fullName:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0],
          phone: user.user_metadata?.phone || null,
          phoneNormalized: normalizePhoneOrNull(user.user_metadata?.phone),
        },
      });
    }

    const appointments = await getClientAppointments(profile.id);
    const response = apiSuccess(appointments);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar agendamentos");
  }
}

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

    // Rate limiting check
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("appointments", clientId);
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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const body = await request.json();

    // Validate input
    const validation = createAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    // Get or create client profile
    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      // Auto-create profile from Supabase user data
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          fullName:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0],
          phone: user.user_metadata?.phone || null,
          phoneNormalized: normalizePhoneOrNull(user.user_metadata?.phone),
        },
      });
    }

    // Create appointment
    const appointment = await createAppointment(validation.data, profile.id);

    // Send confirmation notification
    // appointment.date comes as "YYYY-MM-DD" string from service
    // Use user.id (Supabase auth ID) not profile.id for notifications
    await notifyAppointmentConfirmed(user.id, {
      serviceName: appointment.service.name,
      barberName: appointment.barber.name,
      date: formatDateDdMmYyyyFromIsoDateLike(appointment.date),
      time: appointment.startTime,
    });

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
            "Agendamento deve ser feito com pelo menos 90 minutos de antecedência",
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
