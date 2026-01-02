import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAppointmentAsNoShow } from "@/services/booking";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: appointmentId } = await params;
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

    // Check if user is a barber
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
    });

    if (!barber) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Apenas barbeiros podem marcar ausência",
        },
        { status: 403 },
      );
    }

    const appointment = await markAppointmentAsNoShow(appointmentId, barber.id);

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Error marking appointment as no-show:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "APPOINTMENT_NOT_FOUND":
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Agendamento não encontrado" },
            { status: 404 },
          );
        case "UNAUTHORIZED":
          return NextResponse.json(
            {
              error: "FORBIDDEN",
              message: "Você não tem permissão para marcar este agendamento",
            },
            { status: 403 },
          );
        case "APPOINTMENT_NOT_MARKABLE":
          return NextResponse.json(
            {
              error: "CONFLICT",
              message:
                "Este agendamento não pode ser marcado como ausência (status inválido)",
            },
            { status: 409 },
          );
        case "APPOINTMENT_NOT_STARTED":
          return NextResponse.json(
            {
              error: "PRECONDITION_FAILED",
              message:
                "Só é possível marcar ausência após o horário do agendamento",
            },
            { status: 412 },
          );
      }
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
