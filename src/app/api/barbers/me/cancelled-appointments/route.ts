import { prisma } from "@/lib/prisma";
import { apiCollection } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
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

const cancelledStatuses = [
  "CANCELLED_BY_CLIENT",
  "CANCELLED_BY_BARBER",
] as const;
/**
 * GET /api/barbers/me/cancelled-appointments
 * Lists cancelled appointments with pagination.
 * Query params: page, limit
 */
export async function GET(request: Request) {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const cancelledWhere = {
      status: { in: [...cancelledStatuses] },
      barberId: auth.barberId,
    };

    const [total, cancelledAppointments] = await Promise.all([
      prisma.appointment.count({ where: cancelledWhere }),
      prisma.appointment.findMany({
        where: cancelledWhere,
        include: {
          client: { select: { fullName: true } },
          guestClient: { select: { fullName: true } },
          service: { select: { name: true, price: true } },
          barber: { select: { name: true } },
        },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        skip,
        take: limit,
      }),
    ]);

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

    return apiCollection(appointments, paginationMeta(total, page, limit));
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar agendamentos cancelados");
  }
}
