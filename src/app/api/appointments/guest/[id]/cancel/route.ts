import { NextResponse } from "next/server";
import { cancelAppointmentByGuest } from "@/services/booking";
import { z } from "zod";
import { notifyBarberOfAppointmentCancelledByClient } from "@/services/notification";

const cancelSchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = cancelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const appointment = await cancelAppointmentByGuest(
      id,
      validation.data.phone,
    );

    await notifyBarberOfAppointmentCancelledByClient(appointment);

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Error cancelling guest appointment:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "GUEST_NOT_FOUND":
          return NextResponse.json(
            { error: "GUEST_NOT_FOUND", message: "Cliente não encontrado" },
            { status: 404 },
          );
        case "APPOINTMENT_NOT_FOUND":
          return NextResponse.json(
            {
              error: "APPOINTMENT_NOT_FOUND",
              message: "Agendamento não encontrado",
            },
            { status: 404 },
          );
        case "UNAUTHORIZED":
          return NextResponse.json(
            {
              error: "UNAUTHORIZED",
              message: "Você não tem permissão para cancelar este agendamento",
            },
            { status: 403 },
          );
        case "APPOINTMENT_NOT_CANCELLABLE":
          return NextResponse.json(
            {
              error: "APPOINTMENT_NOT_CANCELLABLE",
              message: "Este agendamento não pode ser cancelado",
            },
            { status: 400 },
          );
        case "CANCELLATION_TOO_LATE":
          return NextResponse.json(
            {
              error: "CANCELLATION_TOO_LATE",
              message:
                "Cancelamento deve ser feito com pelo menos 2 horas de antecedência",
            },
            { status: 400 },
          );
      }
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao cancelar agendamento" },
      { status: 500 },
    );
  }
}
