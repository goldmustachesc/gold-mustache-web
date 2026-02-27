import { NextResponse } from "next/server";
import { createGuestAppointment } from "@/services/booking";
import { createGuestAppointmentSchema } from "@/lib/validations/booking";
import { Prisma } from "@prisma/client";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import { resolveBookingMode } from "@/lib/booking-mode";

export async function POST(request: Request) {
  try {
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

    // Rate limiting check - stricter for guest appointments
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

    const body = await request.json();

    // Validate input
    const validation = createGuestAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    // Create appointment for guest (returns appointment + accessToken)
    const { appointment, accessToken } = await createGuestAppointment(
      validation.data,
    );

    // Return both the appointment and the access token for localStorage
    return NextResponse.json({ appointment, accessToken }, { status: 201 });
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
