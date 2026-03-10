import { apiSuccess, apiError } from "@/lib/api/response";
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
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { requireValidOrigin } from "@/lib/api/verify-origin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const { id: appointmentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", "Corpo da requisição inválido", 400);
    }

    const [appointmentToCancel, barber] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { barberId: true, clientId: true },
      }),
      prisma.barber.findUnique({
        where: { userId: user.id },
      }),
    ]);

    if (!appointmentToCancel) {
      return apiError("NOT_FOUND", "Agendamento não encontrado", 404);
    }

    const isBarberOfThisAppointment =
      barber && appointmentToCancel.barberId === barber.id;

    if (isBarberOfThisAppointment) {
      // Barber cancellation - requires reason
      const validation = cancelAppointmentByBarberSchema.safeParse({
        appointmentId,
        reason: body.reason,
      });

      if (!validation.success) {
        return apiError(
          "VALIDATION_ERROR",
          "Dados inválidos",
          422,
          validation.error.flatten().fieldErrors,
        );
      }

      const appointment = await cancelAppointmentByBarber(
        appointmentId,
        barber.id,
        validation.data.reason,
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
            reason: validation.data.reason,
          });
        }
      }

      return apiSuccess(appointment);
    }

    // Client cancellation (including barbers who are clients of other barbers)
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return apiError("PROFILE_NOT_FOUND", "Perfil não encontrado", 404);
    }

    const appointment = await cancelAppointmentByClient(
      appointmentId,
      profile.id,
    );

    await notifyBarberOfAppointmentCancelledByClient(appointment);

    return apiSuccess(appointment);
  } catch (error) {
    if (error instanceof Error) {
      const domainErrors: Record<
        string,
        { status: number; error: string; message: string }
      > = {
        APPOINTMENT_IN_PAST: {
          status: 400,
          error: "APPOINTMENT_IN_PAST",
          message: "Este agendamento já passou e não pode ser cancelado",
        },
        CANCELLATION_REASON_REQUIRED: {
          status: 400,
          error: "CANCELLATION_REASON_REQUIRED",
          message: "Motivo do cancelamento é obrigatório",
        },
        APPOINTMENT_NOT_CANCELLABLE: {
          status: 400,
          error: "APPOINTMENT_NOT_CANCELLABLE",
          message: "Este agendamento não pode ser cancelado",
        },
        APPOINTMENT_NOT_FOUND: {
          status: 404,
          error: "NOT_FOUND",
          message: "Agendamento não encontrado",
        },
        UNAUTHORIZED: {
          status: 401,
          error: "UNAUTHORIZED",
          message: "Não autorizado",
        },
      };

      const mapped = domainErrors[error.message];
      if (mapped) {
        return apiError(mapped.error, mapped.message, mapped.status);
      }
    }

    return handlePrismaError(error, "Erro ao cancelar agendamento");
  }
}
