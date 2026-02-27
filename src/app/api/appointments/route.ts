import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAppointment,
  getClientAppointments,
  getBarberAppointments,
} from "@/services/booking";
import { notifyAppointmentConfirmed } from "@/services/notification";
import { linkGuestAppointmentsToProfile } from "@/services/guest-linking";
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

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = getAppointmentsQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      barberId: searchParams.get("barberId") ?? undefined,
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: queryValidation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { startDate, endDate, barberId } = queryValidation.data;

    // Check if user is a barber
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
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
          : new Date(getTodayUTCMidnight().getTime() + 7 * 24 * 60 * 60 * 1000),
      };

      const appointments = await getBarberAppointments(barber.id, dateRange);
      return NextResponse.json({ appointments });
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
        },
      });

      // Link any guest appointments to this new profile
      if (profile.phone) {
        await linkGuestAppointmentsToProfile(profile.id, profile.phone);
      }
    }

    const appointments = await getClientAppointments(profile.id);
    return NextResponse.json({ appointments });
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
      return NextResponse.json(
        {
          error: "BOOKING_DISABLED",
          message: "Agendamento interno indisponível no momento.",
        },
        { status: 403 },
      );
    }

    // Rate limiting check
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("appointments", clientId);
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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate input
    const validation = createAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
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
        },
      });

      // Link any guest appointments to this new profile
      if (profile.phone) {
        await linkGuestAppointmentsToProfile(profile.id, profile.phone);
      }
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

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const domainErrors: Record<
        string,
        { status: number; error: string; message: string }
      > = {
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
      };

      const mapped = domainErrors[error.message];
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error, message: mapped.message },
          { status: mapped.status },
        );
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "SLOT_OCCUPIED", message: "Este horário já está ocupado" },
        { status: 409 },
      );
    }

    return handlePrismaError(error, "Erro ao criar agendamento");
  }
}
