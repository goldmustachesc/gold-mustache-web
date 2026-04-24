import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import {
  formatPrismaDateToString,
  parseDateStringToUTC,
} from "@/utils/time-slots";

export type AbsenceRecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface BarberAbsenceRecurrenceData {
  id: string;
  barberId: string;
  startDate: string;
  frequency: AbsenceRecurrenceFrequency;
  interval: number;
  endsAt: string | null;
  occurrenceCount: number | null;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BarberAbsenceRecurrenceInput {
  startDate: string;
  frequency: AbsenceRecurrenceFrequency;
  interval: number;
  endsAt?: string | null;
  occurrenceCount?: number | null;
}

export const MAX_RECURRENCE_HORIZON_MONTHS = 12;
const MAX_RECURRENCE_ATTEMPTS = 730;

export interface BuildAbsenceRecurrenceDatesResult {
  dates: string[];
  truncated: boolean;
}

function addFrequencyStep(
  startDate: Date,
  frequency: AbsenceRecurrenceFrequency,
  interval: number,
  stepIndex: number,
): Date {
  const nextDate = new Date(startDate);
  const offset = interval * stepIndex;

  if (frequency === "DAILY") {
    nextDate.setUTCDate(nextDate.getUTCDate() + offset);
    return nextDate;
  }

  if (frequency === "WEEKLY") {
    nextDate.setUTCDate(nextDate.getUTCDate() + offset * 7);
    return nextDate;
  }

  nextDate.setUTCMonth(nextDate.getUTCMonth() + offset);
  return nextDate;
}

function isMonthlyCandidateValid(startDate: Date, candidate: Date): boolean {
  return candidate.getUTCDate() === startDate.getUTCDate();
}

export function buildAbsenceRecurrenceDates(
  input: BarberAbsenceRecurrenceInput,
): BuildAbsenceRecurrenceDatesResult {
  const startDate = parseDateStringToUTC(input.startDate);
  const endDate = input.endsAt ? parseDateStringToUTC(input.endsAt) : null;
  const horizon = new Date(startDate);
  horizon.setUTCMonth(horizon.getUTCMonth() + MAX_RECURRENCE_HORIZON_MONTHS);

  const desiredCount = input.occurrenceCount ?? Number.POSITIVE_INFINITY;
  const dates: string[] = [];
  let truncated = false;

  for (
    let stepIndex = 0;
    stepIndex < MAX_RECURRENCE_ATTEMPTS && dates.length < desiredCount;
    stepIndex += 1
  ) {
    const candidate = addFrequencyStep(
      startDate,
      input.frequency,
      input.interval,
      stepIndex,
    );

    if (input.frequency === "MONTHLY" && stepIndex > 0) {
      if (!isMonthlyCandidateValid(startDate, candidate)) {
        continue;
      }
    }

    if (candidate > horizon) {
      truncated = true;
      break;
    }

    if (endDate && candidate > endDate) {
      break;
    }

    dates.push(formatPrismaDateToString(candidate));
  }

  if (dates.length < desiredCount && Number.isFinite(desiredCount)) {
    truncated = true;
  }

  return { dates, truncated };
}

export function isAbsenceRecurrenceWithinSupportedHorizon(
  startDate: string,
  endsAt: string,
): boolean {
  const horizon = parseDateStringToUTC(startDate);
  horizon.setUTCMonth(horizon.getUTCMonth() + MAX_RECURRENCE_HORIZON_MONTHS);
  return parseDateStringToUTC(endsAt) <= horizon;
}

function describeFrequency(
  frequency: AbsenceRecurrenceFrequency,
  interval: number,
): string {
  const base = {
    DAILY: "diariamente",
    WEEKLY: "semanalmente",
    MONTHLY: "mensalmente",
  }[frequency];

  if (interval === 1) {
    return base;
  }

  const unit = {
    DAILY: "dia",
    WEEKLY: "semana",
    MONTHLY: "mês",
  }[frequency];

  return `a cada ${interval} ${interval === 1 ? unit : `${unit}s`}`;
}

export function buildAbsenceRecurrenceSummary(
  recurrence: Pick<
    BarberAbsenceRecurrenceData,
    "endsAt" | "frequency" | "interval" | "occurrenceCount"
  > | null,
): string | null {
  if (!recurrence) return null;

  const frequencyLabel = describeFrequency(
    recurrence.frequency,
    recurrence.interval,
  );
  const endLabel = recurrence.endsAt
    ? `até ${formatDateDdMmYyyyFromIsoDateLike(recurrence.endsAt)}`
    : recurrence.occurrenceCount
      ? `por ${recurrence.occurrenceCount} ocorrência${recurrence.occurrenceCount === 1 ? "" : "s"}`
      : null;

  return endLabel ? `${frequencyLabel} ${endLabel}` : frequencyLabel;
}
