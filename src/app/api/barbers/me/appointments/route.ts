import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createAppointmentByBarber } from "@/services/booking";
import { createAppointmentByBarberSchema } from "@/lib/validations/booking";
import { Prisma } from "@prisma/client";

/**
 * POST /api/barbers/me/appointments
 * Creates an appointment for a client on behalf of the barber
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    // Check if user is a barber
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
    });

    if (!barber) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Apenas barbeiros podem criar agendamentos para clientes",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate input
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

    // Create appointment
    const appointment = await createAppointmentByBarber(
      validation.data,
      barber.id,
    );

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Error creating appointment by barber:", error);

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
          message: "Você não atende neste horário",
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
