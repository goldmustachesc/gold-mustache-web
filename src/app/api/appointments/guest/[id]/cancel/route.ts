import { NextResponse } from "next/server";
import { cancelAppointmentByGuestToken } from "@/services/booking";
import { notifyBarberOfAppointmentCancelledByClient } from "@/services/notification";

/**
 * PATCH /api/appointments/guest/[id]/cancel
 * Cancels a guest appointment using the X-Guest-Token header for authentication.
 * This is more secure than the old phone-based cancellation.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accessToken = request.headers.get("X-Guest-Token");

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "MISSING_TOKEN",
          message: "Token de acesso não fornecido",
        },
        { status: 401 },
      );
    }

    const appointment = await cancelAppointmentByGuestToken(id, accessToken);

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
        case "APPOINTMENT_IN_PAST":
          return NextResponse.json(
            {
              error: "APPOINTMENT_IN_PAST",
              message: "Este agendamento já passou e não pode ser cancelado",
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
