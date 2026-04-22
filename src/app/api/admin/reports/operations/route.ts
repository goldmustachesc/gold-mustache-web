import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { apiSuccess, apiError } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import type {
  OperationalReportsData,
  RetentionBucket,
} from "@/types/operations-report";

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function computeRetentionBucket(
  lastAppointmentDates: Date[],
  asOf: Date,
): RetentionBucket {
  const d30 = new Date(asOf);
  d30.setUTCDate(d30.getUTCDate() - 30);
  const d60 = new Date(asOf);
  d60.setUTCDate(d60.getUTCDate() - 60);
  const d90 = new Date(asOf);
  d90.setUTCDate(d90.getUTCDate() - 90);

  return {
    totalWithHistory: lastAppointmentDates.length,
    inactive30Days: lastAppointmentDates.filter((date) => date < d30).length,
    inactive60Days: lastAppointmentDates.filter((date) => date < d60).length,
    inactive90Days: lastAppointmentDates.filter((date) => date < d90).length,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const now = new Date();
    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      month: searchParams.get("month") ?? now.getUTCMonth() + 1,
      year: searchParams.get("year") ?? now.getUTCFullYear(),
    });

    if (!parsedQuery.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Parâmetros inválidos. Use month e year válidos.",
        400,
        parsedQuery.error.flatten().fieldErrors,
      );
    }

    const { month, year } = parsedQuery.data;
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEndExclusive = new Date(Date.UTC(year, month, 1));
    const asOf = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const [noShowAppointments, registeredHistory, guestHistory] =
      await Promise.all([
        prisma.appointment.findMany({
          where: {
            status: AppointmentStatus.NO_SHOW,
            date: {
              gte: periodStart,
              lt: periodEndExclusive,
            },
          },
          select: {
            id: true,
            barberId: true,
            service: {
              select: {
                price: true,
              },
            },
            barber: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.appointment.groupBy({
          by: ["clientId"],
          where: {
            clientId: { not: null },
            date: { lte: asOf },
          },
          _max: {
            date: true,
          },
        }),
        prisma.appointment.groupBy({
          by: ["guestClientId"],
          where: {
            guestClientId: { not: null },
            date: { lte: asOf },
          },
          _max: {
            date: true,
          },
        }),
      ]);

    const noShowByBarberMap = new Map<
      string,
      { barberName: string; noShowCount: number; lostRevenue: number }
    >();

    for (const appointment of noShowAppointments) {
      const current = noShowByBarberMap.get(appointment.barberId) ?? {
        barberName: appointment.barber.name,
        noShowCount: 0,
        lostRevenue: 0,
      };
      current.noShowCount += 1;
      current.lostRevenue += Number(appointment.service.price);
      noShowByBarberMap.set(appointment.barberId, current);
    }

    const noShowByBarber = Array.from(noShowByBarberMap.entries())
      .map(([barberId, row]) => ({
        barberId,
        barberName: row.barberName,
        noShowCount: row.noShowCount,
        lostRevenue: row.lostRevenue,
      }))
      .sort((a, b) => {
        if (b.lostRevenue !== a.lostRevenue) {
          return b.lostRevenue - a.lostRevenue;
        }
        return b.noShowCount - a.noShowCount;
      });

    const report: OperationalReportsData = {
      period: {
        month,
        year,
        startDate: toIsoDate(periodStart),
        endDate: toIsoDate(new Date(periodEndExclusive.getTime() - 1)),
      },
      noShow: {
        totalNoShows: noShowAppointments.length,
        totalLostRevenue: noShowAppointments.reduce(
          (sum, appointment) => sum + Number(appointment.service.price),
          0,
        ),
        byBarber: noShowByBarber,
      },
      retention: {
        asOf: toIsoDate(asOf),
        registeredClients: computeRetentionBucket(
          registeredHistory
            .map((row) => row._max.date)
            .filter((date): date is Date => date !== null),
          asOf,
        ),
        guestClients: computeRetentionBucket(
          guestHistory
            .map((row) => row._max.date)
            .filter((date): date is Date => date !== null),
          asOf,
        ),
      },
    };

    return apiSuccess(report);
  } catch (error) {
    return handlePrismaError(error, "Erro ao gerar relatório operacional");
  }
}
