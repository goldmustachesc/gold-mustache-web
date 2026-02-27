import { NextResponse } from "next/server";
import { createAppointmentByBarber } from "@/services/booking";
import { createAppointmentByBarberSchema } from "@/lib/validations/booking";
import { Prisma } from "@prisma/client";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";

/**
 * POST /api/barbers/me/appointments
 * Creates an appointment for a client on behalf of the barber
 */
export async function POST(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const validation = createAppointmentByBarberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const appointment = await createAppointmentByBarber(
      validation.data,
      auth.barberId,
    );

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
