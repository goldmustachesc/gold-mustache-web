import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { z } from "zod";
import type { FinancialStats } from "@/types/financial";
import { requireBarber } from "@/lib/auth/requireBarber";

const querySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
});

/**
 * GET /api/barbers/me/financial?month=1&year=2026
 * Returns financial statistics for the authenticated barber
 */
export async function GET(request: Request) {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const query = querySchema.safeParse({
      month: searchParams.get("month"),
      year: searchParams.get("year"),
    });

    if (!query.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parâmetros inválidos. Use ?month=1&year=2026",
        },
        { status: 400 },
      );
    }

    const { month, year } = query.data;
    const stats = await calculateFinancialStats(auth.barberId, month, year);

    return NextResponse.json({ stats, barberName: auth.barberName });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar estatísticas");
  }
}

async function calculateFinancialStats(
  barberId: string,
  month: number,
  year: number,
): Promise<FinancialStats> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["COMPLETED", "CONFIRMED"],
      },
    },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          price: true,
          duration: true,
        },
      },
      client: {
        select: { id: true },
      },
      guestClient: {
        select: { id: true },
      },
    },
    orderBy: { date: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate < today || apt.status === "COMPLETED";
  });

  const totalRevenue = completedAppointments.reduce(
    (sum, apt) => sum + Number(apt.service.price),
    0,
  );
  const totalAppointments = completedAppointments.length;

  const dailyRevenueMap = new Map<string, { revenue: number; count: number }>();

  const daysInMonth = endDate.getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dailyRevenueMap.set(dateStr, { revenue: 0, count: 0 });
  }

  for (const apt of completedAppointments) {
    const dateStr = apt.date.toISOString().split("T")[0];
    const existing = dailyRevenueMap.get(dateStr) || { revenue: 0, count: 0 };
    dailyRevenueMap.set(dateStr, {
      revenue: existing.revenue + Number(apt.service.price),
      count: existing.count + 1,
    });
  }

  const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(
    ([date, data]) => ({
      date,
      revenue: data.revenue,
      count: data.count,
    }),
  );

  const serviceMap = new Map<
    string,
    { name: string; count: number; revenue: number }
  >();

  for (const apt of completedAppointments) {
    const existing = serviceMap.get(apt.serviceId) || {
      name: apt.service.name,
      count: 0,
      revenue: 0,
    };
    serviceMap.set(apt.serviceId, {
      name: apt.service.name,
      count: existing.count + 1,
      revenue: existing.revenue + Number(apt.service.price),
    });
  }

  const serviceBreakdown = Array.from(serviceMap.entries())
    .map(([serviceId, data]) => ({
      serviceId,
      name: data.name,
      count: data.count,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.count - a.count);

  const ticketMedio =
    totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

  const uniqueClientIds = new Set<string>();
  for (const apt of completedAppointments) {
    if (apt.client?.id) {
      uniqueClientIds.add(`client_${apt.client.id}`);
    } else if (apt.guestClient?.id) {
      uniqueClientIds.add(`guest_${apt.guestClient.id}`);
    }
  }
  const uniqueClients = uniqueClientIds.size;

  const workedMinutes = completedAppointments.reduce(
    (sum, apt) => sum + apt.service.duration,
    0,
  );
  const workedHours = workedMinutes / 60;

  const workingHours = await prisma.workingHours.findMany({
    where: { barberId },
  });

  const absences = await prisma.barberAbsence.findMany({
    where: {
      barberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  let availableMinutes = 0;
  let closedMinutes = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay();

    const dayWorkingHours = workingHours.find(
      (wh) => wh.dayOfWeek === dayOfWeek,
    );

    if (dayWorkingHours) {
      const [startH, startM] = dayWorkingHours.startTime.split(":").map(Number);
      const [endH, endM] = dayWorkingHours.endTime.split(":").map(Number);
      let dayMinutes = endH * 60 + endM - (startH * 60 + startM);

      if (dayWorkingHours.breakStart && dayWorkingHours.breakEnd) {
        const [breakStartH, breakStartM] = dayWorkingHours.breakStart
          .split(":")
          .map(Number);
        const [breakEndH, breakEndM] = dayWorkingHours.breakEnd
          .split(":")
          .map(Number);
        dayMinutes -=
          breakEndH * 60 + breakEndM - (breakStartH * 60 + breakStartM);
      }

      const dateStr = currentDate.toISOString().split("T")[0];
      const dayAbsence = absences.find(
        (a) => a.date.toISOString().split("T")[0] === dateStr,
      );

      if (dayAbsence) {
        if (!dayAbsence.startTime || !dayAbsence.endTime) {
          closedMinutes += dayMinutes;
        } else {
          const [absStartH, absStartM] = dayAbsence.startTime
            .split(":")
            .map(Number);
          const [absEndH, absEndM] = dayAbsence.endTime.split(":").map(Number);
          const absenceMinutes =
            absEndH * 60 + absEndM - (absStartH * 60 + absStartM);
          closedMinutes += absenceMinutes;
          availableMinutes += dayMinutes - absenceMinutes;
        }
      } else {
        availableMinutes += dayMinutes;
      }
    }
  }

  const availableHours = availableMinutes / 60;
  const closedHours = closedMinutes / 60;
  const idleHours = Math.max(0, availableHours - workedHours);

  const occupancyRate =
    availableHours > 0 ? (workedHours / availableHours) * 100 : 0;

  return {
    totalRevenue,
    totalAppointments,
    dailyRevenue,
    serviceBreakdown,
    ticketMedio,
    occupancyRate: Math.round(occupancyRate),
    uniqueClients,
    availableHours: Math.round(availableHours),
    workedHours: Math.round(workedHours),
    idleHours: Math.round(idleHours),
    closedHours: Math.round(closedHours),
  };
}
