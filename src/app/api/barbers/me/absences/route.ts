import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  barberAbsenceSchema,
  dateRangeQuerySchema,
} from "@/lib/validations/booking";
import {
  parseDateStringToUTC,
  parseTimeToMinutes,
  formatPrismaDateToString,
} from "@/utils/time-slots";
import { AppointmentStatus, type Prisma } from "@prisma/client";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function GET(request: Request) {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const queryValidation = dateRangeQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    if (!queryValidation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        queryValidation.error.flatten().fieldErrors,
      );
    }

    const { startDate, endDate } = queryValidation.data;

    const where: Prisma.BarberAbsenceWhereInput = {
      barberId: auth.barberId,
    };

    const gteDate = startDate ? parseDateStringToUTC(startDate) : undefined;
    let ltDate: Date | undefined;
    if (endDate) {
      ltDate = parseDateStringToUTC(endDate);
      ltDate.setUTCDate(ltDate.getUTCDate() + 1);
    }
    if (gteDate || ltDate) {
      where.date = {
        ...(gteDate && { gte: gteDate }),
        ...(ltDate && { lt: ltDate }),
      };
    }

    const absences = await prisma.barberAbsence.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const absencesList = absences.map((a) => ({
      id: a.id,
      barberId: a.barberId,
      date: formatPrismaDateToString(a.date),
      startTime: a.startTime,
      endTime: a.endTime,
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
    return apiSuccess(absencesList);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar ausências");
  }
}

export async function POST(request: Request) {
  try {
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const validation = barberAbsenceSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const {
      date,
      startTime = null,
      endTime = null,
      reason = null,
    } = validation.data;
    const dateDb = parseDateStringToUTC(date);

    const confirmedAppointments = await prisma.appointment.findMany({
      where: {
        barberId: auth.barberId,
        date: dateDb,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        client: { select: { fullName: true } },
        guestClient: { select: { fullName: true } },
        service: { select: { name: true } },
      },
      orderBy: [{ startTime: "asc" }],
    });

    let conflicts = confirmedAppointments;
    if (startTime && endTime) {
      const absenceStart = parseTimeToMinutes(startTime);
      const absenceEnd = parseTimeToMinutes(endTime);
      conflicts = confirmedAppointments.filter((apt) => {
        const aptStart = parseTimeToMinutes(apt.startTime);
        const aptEnd = parseTimeToMinutes(apt.endTime);
        return rangesOverlap(absenceStart, absenceEnd, aptStart, aptEnd);
      });
    }

    if (conflicts.length > 0) {
      return apiError(
        "ABSENCE_CONFLICT",
        "Existem agendamentos confirmados no período informado.",
        409,
        conflicts.map((apt) => ({
          id: apt.id,
          startTime: apt.startTime,
          endTime: apt.endTime,
          serviceName: apt.service.name,
          clientName: apt.client?.fullName ?? apt.guestClient?.fullName ?? null,
        })),
      );
    }

    const created = await prisma.barberAbsence.create({
      data: {
        barberId: auth.barberId,
        date: dateDb,
        startTime,
        endTime,
        reason,
      },
    });

    const absence = {
      id: created.id,
      barberId: created.barberId,
      date: formatPrismaDateToString(created.date),
      startTime: created.startTime,
      endTime: created.endTime,
      reason: created.reason,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
    return apiSuccess(absence, 201);
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar ausência");
  }
}
