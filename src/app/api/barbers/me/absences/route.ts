import { AppointmentStatus, type Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { requireBarber } from "@/lib/auth/requireBarber";
import { mapPrismaBarberAbsence } from "@/lib/barber-absence-mapper";
import {
  buildAbsenceRecurrenceDates,
  type AbsenceRecurrenceFrequency,
} from "@/lib/barber-absence-recurrence";
import { prisma } from "@/lib/prisma";
import {
  barberAbsenceCreateSchema,
  dateRangeQuerySchema,
} from "@/lib/validations/booking";
import { notifyAppointmentCancelledByBarber } from "@/services/notification";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import {
  formatPrismaDateToString,
  parseDateStringToUTC,
  parseTimeToMinutes,
} from "@/utils/time-slots";

type AbsenceConflictDetail = {
  date: string;
  startTime: string | null;
  endTime: string | null;
  serviceName: string | null;
  clientName: string | null;
  reason?: string | null;
  kind: "APPOINTMENT" | "ABSENCE";
};

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isRecurringFrequency(
  value: unknown,
): value is AbsenceRecurrenceFrequency {
  return value === "DAILY" || value === "WEEKLY" || value === "MONTHLY";
}

function buildConflictDetailFromAppointment(appointment: {
  client?: { fullName: string | null } | null;
  date: Date;
  endTime: string;
  guestClient?: { fullName: string } | null;
  service: { name: string };
  startTime: string;
}): AbsenceConflictDetail {
  return {
    kind: "APPOINTMENT",
    date: formatPrismaDateToString(appointment.date),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    serviceName: appointment.service.name,
    clientName:
      appointment.client?.fullName ?? appointment.guestClient?.fullName ?? null,
  };
}

function buildConflictDetailFromAbsence(absence: {
  date: Date;
  endTime: string | null;
  id: string;
  reason: string | null;
  startTime: string | null;
}): AbsenceConflictDetail {
  return {
    kind: "ABSENCE",
    date: formatPrismaDateToString(absence.date),
    startTime: absence.startTime,
    endTime: absence.endTime,
    serviceName: null,
    clientName: null,
    reason: absence.reason ?? "Já existe uma ausência cadastrada.",
  };
}

function collectTimeConflicts(params: {
  absenceDates: string[];
  absenceStartTime: string | null;
  absenceEndTime: string | null;
  appointments: Array<{
    client?: { fullName: string | null } | null;
    date: Date;
    endTime: string;
    guestClient?: { fullName: string } | null;
    service: { name: string };
    startTime: string;
  }>;
  absences: Array<{
    date: Date;
    endTime: string | null;
    id: string;
    reason: string | null;
    startTime: string | null;
  }>;
}): AbsenceConflictDetail[] {
  const {
    absenceDates,
    absenceStartTime,
    absenceEndTime,
    appointments,
    absences,
  } = params;
  const dateSet = new Set(absenceDates);
  const conflicts: AbsenceConflictDetail[] = [];

  for (const appointment of appointments) {
    const appointmentDate = formatPrismaDateToString(appointment.date);
    if (!dateSet.has(appointmentDate)) continue;

    if (!absenceStartTime || !absenceEndTime) {
      conflicts.push(buildConflictDetailFromAppointment(appointment));
      continue;
    }

    const absenceStart = parseTimeToMinutes(absenceStartTime);
    const absenceEnd = parseTimeToMinutes(absenceEndTime);
    const appointmentStart = parseTimeToMinutes(appointment.startTime);
    const appointmentEnd = parseTimeToMinutes(appointment.endTime);

    if (
      rangesOverlap(absenceStart, absenceEnd, appointmentStart, appointmentEnd)
    ) {
      conflicts.push(buildConflictDetailFromAppointment(appointment));
    }
  }

  for (const existingAbsence of absences) {
    const existingDate = formatPrismaDateToString(existingAbsence.date);
    if (!dateSet.has(existingDate)) continue;

    if (
      !absenceStartTime ||
      !absenceEndTime ||
      !existingAbsence.startTime ||
      !existingAbsence.endTime
    ) {
      conflicts.push(buildConflictDetailFromAbsence(existingAbsence));
      continue;
    }

    const absenceStart = parseTimeToMinutes(absenceStartTime);
    const absenceEnd = parseTimeToMinutes(absenceEndTime);
    const existingStart = parseTimeToMinutes(existingAbsence.startTime);
    const existingEnd = parseTimeToMinutes(existingAbsence.endTime);

    if (rangesOverlap(absenceStart, absenceEnd, existingStart, existingEnd)) {
      conflicts.push(buildConflictDetailFromAbsence(existingAbsence));
    }
  }

  return conflicts;
}

function mapCreatedRecurrence(recurrence: {
  barberId: string;
  createdAt: Date;
  endsAt: Date | null;
  frequency: AbsenceRecurrenceFrequency;
  id: string;
  interval: number;
  occurrenceCount: number | null;
  reason: string | null;
  startDate: Date;
  startTime: string | null;
  endTime: string | null;
  updatedAt: Date;
}) {
  return {
    id: recurrence.id,
    barberId: recurrence.barberId,
    startDate: formatPrismaDateToString(recurrence.startDate),
    frequency: recurrence.frequency,
    interval: recurrence.interval,
    endsAt: recurrence.endsAt
      ? formatPrismaDateToString(recurrence.endsAt)
      : null,
    occurrenceCount: recurrence.occurrenceCount,
    startTime: recurrence.startTime,
    endTime: recurrence.endTime,
    reason: recurrence.reason,
    createdAt: recurrence.createdAt.toISOString(),
    updatedAt: recurrence.updatedAt.toISOString(),
  };
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
      include: { recurrence: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return apiSuccess(absences.map(mapPrismaBarberAbsence));
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
    const validation = barberAbsenceCreateSchema.safeParse(body);
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
      autoCancelConflicts = false,
      recurrence = null,
      reason = null,
    } = validation.data;
    const dateDb = parseDateStringToUTC(date);
    const shouldAutoCancelConflicts =
      autoCancelConflicts && recurrence === null;

    const absenceDates =
      recurrence &&
      isRecurringFrequency(recurrence.frequency) &&
      recurrence.interval > 0
        ? buildAbsenceRecurrenceDates({
            startDate: date,
            frequency: recurrence.frequency,
            interval: recurrence.interval,
            endsAt: recurrence.endsAt ?? null,
            occurrenceCount: recurrence.occurrenceCount ?? null,
          })
        : { dates: [date], truncated: false };

    if (recurrence && absenceDates.dates.length === 0) {
      return apiError(
        "VALIDATION_ERROR",
        "A recorrência precisa gerar pelo menos uma ocorrência.",
        422,
      );
    }

    if (recurrence && absenceDates.truncated) {
      return apiError(
        "VALIDATION_ERROR",
        "A recorrência não pode ultrapassar o limite de 12 meses.",
        422,
      );
    }

    const startRange = parseDateStringToUTC(absenceDates.dates[0]);
    const endRange = parseDateStringToUTC(
      absenceDates.dates[absenceDates.dates.length - 1],
    );

    const [confirmedAppointments, existingAbsences] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          barberId: auth.barberId,
          date: {
            gte: startRange,
            lte: endRange,
          },
          status: AppointmentStatus.CONFIRMED,
        },
        include: {
          client: { select: { fullName: true, userId: true } },
          guestClient: { select: { fullName: true } },
          service: { select: { name: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.barberAbsence.findMany({
        where: {
          barberId: auth.barberId,
          date: {
            gte: startRange,
            lte: endRange,
          },
        },
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          reason: true,
        },
      }),
    ]);

    const conflicts = collectTimeConflicts({
      absenceDates: absenceDates.dates,
      absenceStartTime: startTime,
      absenceEndTime: endTime,
      appointments: confirmedAppointments,
      absences: existingAbsences,
    });

    const blockingConflicts = shouldAutoCancelConflicts
      ? conflicts.filter((conflict) => conflict.kind === "ABSENCE")
      : conflicts;

    if (blockingConflicts.length > 0) {
      return apiError(
        "ABSENCE_CONFLICT",
        "Existem conflitos em uma ou mais datas da ausência.",
        409,
        blockingConflicts,
      );
    }

    const created = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const recurrenceRecord = recurrence
          ? await tx.barberAbsenceRecurrence.create({
              data: {
                barberId: auth.barberId,
                startDate: dateDb,
                frequency: recurrence.frequency,
                interval: recurrence.interval,
                endsAt: recurrence.endsAt
                  ? parseDateStringToUTC(recurrence.endsAt)
                  : null,
                occurrenceCount: recurrence.occurrenceCount ?? null,
                startTime,
                endTime,
                reason,
              },
            })
          : null;

        const createAbsenceData = (absenceDate: string) => ({
          barberId: auth.barberId,
          date: parseDateStringToUTC(absenceDate),
          startTime,
          endTime,
          reason,
          ...(recurrenceRecord ? { recurrenceId: recurrenceRecord.id } : {}),
        });

        let firstAbsence: {
          barberId: string;
          createdAt: Date;
          date: Date;
          endTime: string | null;
          id: string;
          reason: string | null;
          recurrence?: unknown;
          recurrenceId: string | null;
          startTime: string | null;
          updatedAt: Date;
        } | null = null;

        if (recurrence && absenceDates.dates.length > 1) {
          firstAbsence = await tx.barberAbsence.create({
            data: createAbsenceData(absenceDates.dates[0]),
            include: { recurrence: true },
          });

          await tx.barberAbsence.createMany({
            data: absenceDates.dates.slice(1).map(createAbsenceData),
          });
        } else {
          firstAbsence = await tx.barberAbsence.create({
            data: createAbsenceData(absenceDates.dates[0]),
            include: { recurrence: true },
          });
        }

        return {
          recurrence: recurrenceRecord,
          firstAbsence,
          createdAbsenceCount: absenceDates.dates.length,
        };
      },
    );

    if (shouldAutoCancelConflicts) {
      const conflictingAppointments = confirmedAppointments.filter(
        (appointment) => {
          if (!startTime || !endTime) return true;

          const absenceStart = parseTimeToMinutes(startTime);
          const absenceEnd = parseTimeToMinutes(endTime);
          const appointmentStart = parseTimeToMinutes(appointment.startTime);
          const appointmentEnd = parseTimeToMinutes(appointment.endTime);
          return rangesOverlap(
            absenceStart,
            absenceEnd,
            appointmentStart,
            appointmentEnd,
          );
        },
      );

      const conflictIds = conflictingAppointments.map(
        (conflict) => conflict.id,
      );
      const updateResult = await prisma.appointment.updateMany({
        where: {
          id: { in: conflictIds },
          status: AppointmentStatus.CONFIRMED,
        },
        data: {
          status: AppointmentStatus.CANCELLED_BY_BARBER,
          cancelReason: "Cancelado automaticamente por ausência do barbeiro",
          cancelledBy: auth.barberId,
          updatedAt: new Date(),
        },
      });

      const notificationPromises = conflictingAppointments.flatMap(
        (conflict) => {
          const userId = conflict.client?.userId;
          if (!userId) return [];
          return [
            notifyAppointmentCancelledByBarber(userId, {
              serviceName: conflict.service.name,
              barberName: auth.barberName,
              date: formatDateDdMmYyyyFromIsoDateLike(date),
              time: conflict.startTime,
              reason: "Ausência do barbeiro",
              recipientName:
                conflict.client?.fullName?.split(" ")[0] ?? "Cliente",
              appointmentId: conflict.id,
            }),
          ];
        },
      );

      await Promise.allSettled(notificationPromises);

      return apiSuccess(
        {
          ...mapPrismaBarberAbsence(
            created.firstAbsence as Parameters<
              typeof mapPrismaBarberAbsence
            >[0],
          ),
          autoCancelledAppointments: updateResult.count,
          recurrence: created.recurrence
            ? mapCreatedRecurrence(created.recurrence)
            : null,
          createdAbsenceCount: created.createdAbsenceCount,
        },
        201,
      );
    }

    return apiSuccess(
      {
        ...mapPrismaBarberAbsence(
          created.firstAbsence as Parameters<typeof mapPrismaBarberAbsence>[0],
        ),
        recurrence: created.recurrence
          ? mapCreatedRecurrence(created.recurrence)
          : null,
        createdAbsenceCount: created.createdAbsenceCount,
      },
      201,
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar ausência");
  }
}
