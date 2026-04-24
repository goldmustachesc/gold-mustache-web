import type {
  BarberAbsenceData,
  BarberAbsenceRecurrenceData,
  BarberAbsenceRecurrenceFrequency,
} from "@/types/booking";
import { formatPrismaDateToString } from "@/utils/time-slots";

type PrismaAbsenceRecurrence = {
  id: string;
  barberId: string;
  startDate: Date;
  frequency: BarberAbsenceRecurrenceFrequency;
  interval: number;
  endsAt: Date | null;
  occurrenceCount: number | null;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null;

type PrismaAbsence = {
  id: string;
  barberId: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  recurrenceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  recurrence?: PrismaAbsenceRecurrence;
};

function mapRecurrence(
  recurrence: PrismaAbsenceRecurrence,
): BarberAbsenceRecurrenceData | null {
  if (!recurrence) return null;

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

export function mapPrismaBarberAbsence(
  absence: PrismaAbsence,
): BarberAbsenceData {
  return {
    id: absence.id,
    barberId: absence.barberId,
    date: formatPrismaDateToString(absence.date),
    startTime: absence.startTime,
    endTime: absence.endTime,
    reason: absence.reason,
    recurrenceId: absence.recurrenceId,
    recurrence: mapRecurrence(absence.recurrence ?? null),
    createdAt: absence.createdAt.toISOString(),
    updatedAt: absence.updatedAt.toISOString(),
  };
}
