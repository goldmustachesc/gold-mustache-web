import { NextResponse } from "next/server";
import { createGuestAppointment } from "@/services/booking";
import { createGuestAppointmentSchema } from "@/lib/validations/booking";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
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
    console.error("Error creating guest appointment:", error);

    // Handle slot in the past
    if (error instanceof Error && error.message === "SLOT_IN_PAST") {
      return NextResponse.json(
        {
          error: "SLOT_IN_PAST",
          message: "Não é possível agendar em horários que já passaram",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "SHOP_CLOSED") {
      return NextResponse.json(
        {
          error: "SHOP_CLOSED",
          message: "A barbearia não atende neste horário",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "BARBER_UNAVAILABLE") {
      return NextResponse.json(
        {
          error: "BARBER_UNAVAILABLE",
          message: "Este barbeiro não atende neste horário",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "SLOT_UNAVAILABLE") {
      return NextResponse.json(
        {
          error: "SLOT_UNAVAILABLE",
          message: "Este horário não está disponível para agendamento",
        },
        { status: 400 },
      );
    }

    // Handle slot already occupied
    if (error instanceof Error && error.message === "SLOT_OCCUPIED") {
      return NextResponse.json(
        { error: "SLOT_OCCUPIED", message: "Este horário já está ocupado" },
        { status: 409 },
      );
    }

    // Handle unique constraint violation (race condition fallback)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "SLOT_OCCUPIED", message: "Este horário já está ocupado" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao criar agendamento" },
      { status: 500 },
    );
  }
}
