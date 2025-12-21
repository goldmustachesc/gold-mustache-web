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

    // Create appointment for guest
    const appointment = await createGuestAppointment(validation.data);

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Error creating guest appointment:", error);

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
