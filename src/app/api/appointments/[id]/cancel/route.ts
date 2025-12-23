import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  cancelAppointmentByClient,
  cancelAppointmentByBarber,
} from "@/services/booking";
import {
  notifyAppointmentCancelledByBarber,
  notifyAppointmentCancelledByClient,
} from "@/services/notification";
import { cancelAppointmentByBarberSchema } from "@/lib/validations/booking";
import { prisma } from "@/lib/prisma";
import { parseDateString } from "@/utils/time-slots";

export async function PATCH(
  request: Request,
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

    const body = await request.json();
    const { reason } = body;

    // Check if user is a barber
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
    });

    if (barber) {
      // Barber cancellation - requires reason
      const validation = cancelAppointmentByBarberSchema.safeParse({
        appointmentId,
        reason,
      });

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            details: validation.error.flatten().fieldErrors,
          },
          { status: 422 },
        );
      }

      const appointment = await cancelAppointmentByBarber(
        appointmentId,
        barber.id,
        reason,
      );

      // Notify client (appointment.date comes as "YYYY-MM-DD" from service)
      // Only notify registered clients (not guests)
      if (appointment.clientId) {
        await notifyAppointmentCancelledByBarber(appointment.clientId, {
          serviceName: appointment.service.name,
          barberName: appointment.barber.name,
          date: parseDateString(appointment.date).toLocaleDateString("pt-BR"),
          time: appointment.startTime,
          reason,
        });
      }

      return NextResponse.json({ appointment });
    }

    // Client cancellation
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "PROFILE_NOT_FOUND", message: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    const appointment = await cancelAppointmentByClient(
      appointmentId,
      profile.id,
    );

    // Get barber's userId for notification
    const appointmentBarber = await prisma.barber.findUnique({
      where: { id: appointment.barberId },
    });

    if (appointmentBarber) {
      // appointment.date comes as "YYYY-MM-DD" from service
      const clientName =
        appointment.client?.fullName ??
        appointment.guestClient?.fullName ??
        "Cliente";
      await notifyAppointmentCancelledByClient(appointmentBarber.userId, {
        clientName,
        serviceName: appointment.service.name,
        date: parseDateString(appointment.date).toLocaleDateString("pt-BR"),
        time: appointment.startTime,
      });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Error cancelling appointment:", error);

    if (error instanceof Error) {
      if (error.message === "CANCELLATION_TOO_LATE") {
        return NextResponse.json(
          {
            error: "CANCELLATION_TOO_LATE",
            message:
              "Cancelamento deve ser feito com pelo menos 2 horas de antecedência",
          },
          { status: 400 },
        );
      }

      if (error.message === "CANCELLATION_REASON_REQUIRED") {
        return NextResponse.json(
          {
            error: "CANCELLATION_REASON_REQUIRED",
            message: "Motivo do cancelamento é obrigatório",
          },
          { status: 400 },
        );
      }

      if (error.message === "APPOINTMENT_NOT_FOUND") {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Agendamento não encontrado" },
          { status: 404 },
        );
      }

      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "UNAUTHORIZED", message: "Não autorizado" },
          { status: 401 },
        );
      }
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao cancelar agendamento" },
      { status: 500 },
    );
  }
}
