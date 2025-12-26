import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  cancelAppointmentByClient,
  cancelAppointmentByBarber,
} from "@/services/booking";
import {
  notifyAppointmentCancelledByBarber,
  notifyBarberOfAppointmentCancelledByClient,
} from "@/services/notification";
import { cancelAppointmentByBarberSchema } from "@/lib/validations/booking";
import { prisma } from "@/lib/prisma";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";

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

    // Fetch the appointment first to determine the correct cancellation path
    const appointmentToCancel = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { barberId: true, clientId: true },
    });

    if (!appointmentToCancel) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Agendamento não encontrado" },
        { status: 404 },
      );
    }

    // Check if user is a barber and is THE barber of this specific appointment
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
    });

    const isBarberOfThisAppointment =
      barber && appointmentToCancel.barberId === barber.id;

    if (isBarberOfThisAppointment) {
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
      // appointment.clientId is Profile.id, but notifications use Supabase user.id
      if (appointment.clientId) {
        const clientProfile = await prisma.profile.findUnique({
          where: { id: appointment.clientId },
          select: { userId: true },
        });

        if (clientProfile) {
          await notifyAppointmentCancelledByBarber(clientProfile.userId, {
            serviceName: appointment.service.name,
            barberName: appointment.barber.name,
            date: formatDateDdMmYyyyFromIsoDateLike(appointment.date),
            time: appointment.startTime,
            reason,
          });
        }
      }

      return NextResponse.json({ appointment });
    }

    // Client cancellation (including barbers who are clients of other barbers)
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

    await notifyBarberOfAppointmentCancelledByClient(appointment);

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Error cancelling appointment:", error);

    if (error instanceof Error) {
      if (error.message === "APPOINTMENT_IN_PAST") {
        return NextResponse.json(
          {
            error: "APPOINTMENT_IN_PAST",
            message: "Este agendamento já passou e não pode ser cancelado",
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

      if (error.message === "APPOINTMENT_NOT_CANCELLABLE") {
        return NextResponse.json(
          {
            error: "APPOINTMENT_NOT_CANCELLABLE",
            message: "Este agendamento não pode ser cancelado",
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
