import { prisma } from "@/lib/prisma";
import { apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireBarber } from "@/lib/auth/requireBarber";

export interface CancelledAppointmentData {
  id: string;
  date: string;
  startTime: string;
  clientName: string;
  serviceName: string;
  servicePrice: number;
  cancelledBy: "CLIENT" | "BARBER";
  cancelReason: string | null;
  barberName: string;
}

/**
 * GET /api/barbers/me/cancelled-appointments
 * Lists all cancelled appointments from the barbershop
 */
export async function GET() {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const cancelledAppointments = await prisma.appointment.findMany({
      where: {
        status: {
          in: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_BARBER"],
        },
      },
      include: {
        client: {
          select: {
            fullName: true,
          },
        },
        guestClient: {
          select: {
            fullName: true,
          },
        },
        service: {
          select: {
            name: true,
            price: true,
          },
        },
        barber: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
    });

    const appointments: CancelledAppointmentData[] = cancelledAppointments.map(
      (apt) => ({
        id: apt.id,
        date: apt.date.toISOString().split("T")[0],
        startTime: apt.startTime,
        clientName:
          apt.client?.fullName || apt.guestClient?.fullName || "Cliente",
        serviceName: apt.service.name,
        servicePrice: Number(apt.service.price),
        cancelledBy: apt.status === "CANCELLED_BY_CLIENT" ? "CLIENT" : "BARBER",
        cancelReason: apt.cancelReason,
        barberName: apt.barber.name,
      }),
    );

    return apiSuccess(appointments);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar agendamentos cancelados");
  }
}
