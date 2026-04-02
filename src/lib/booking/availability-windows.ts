import { minutesToTime, parseTimeToMinutes } from "@/utils/time-slots";
import type { TimeWindow } from "./availability-policy";
import type { TimeRangeMinutes } from "./time-ranges";

export interface AvailabilityWindow {
  startTime: string;
  endTime: string;
}

interface AppointmentBlock {
  startTime: string;
  endTime: string;
  status: string;
}

interface BuildAvailabilityWindowsParams {
  workingStartTime: string;
  workingEndTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  serviceDurationMinutes: number;
  closures: TimeWindow[];
  absences: TimeWindow[];
  appointments: AppointmentBlock[];
  minimumStartTime?: string | null;
}

function toRange(startTime: string, endTime: string): TimeRangeMinutes {
  return {
    start: parseTimeToMinutes(startTime),
    end: parseTimeToMinutes(endTime),
  };
}

function toWindow(range: TimeRangeMinutes): AvailabilityWindow {
  return {
    startTime: minutesToTime(range.start),
    endTime: minutesToTime(range.end),
  };
}

function normalizeRanges(ranges: TimeRangeMinutes[]): TimeRangeMinutes[] {
  const sorted = [...ranges]
    .filter((range) => range.end > range.start)
    .sort((left, right) => left.start - right.start);

  return sorted.reduce<TimeRangeMinutes[]>((accumulator, current) => {
    const previous = accumulator.at(-1);

    if (!previous) {
      accumulator.push(current);
      return accumulator;
    }

    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
      return accumulator;
    }

    accumulator.push(current);
    return accumulator;
  }, []);
}

function subtractBlockedRange(
  windows: TimeRangeMinutes[],
  blockedRange: TimeRangeMinutes,
): TimeRangeMinutes[] {
  return windows.flatMap((windowRange) => {
    if (
      blockedRange.end <= windowRange.start ||
      blockedRange.start >= windowRange.end
    ) {
      return [windowRange];
    }

    const nextRanges: TimeRangeMinutes[] = [];

    if (blockedRange.start > windowRange.start) {
      nextRanges.push({
        start: windowRange.start,
        end: Math.min(blockedRange.start, windowRange.end),
      });
    }

    if (blockedRange.end < windowRange.end) {
      nextRanges.push({
        start: Math.max(blockedRange.end, windowRange.start),
        end: windowRange.end,
      });
    }

    return nextRanges;
  });
}

export function buildAvailabilityWindows(
  params: BuildAvailabilityWindowsParams,
): AvailabilityWindow[] {
  const {
    workingStartTime,
    workingEndTime,
    breakStart = null,
    breakEnd = null,
    serviceDurationMinutes,
    closures,
    absences,
    appointments,
    minimumStartTime = null,
  } = params;

  if (closures.some((closure) => !closure.startTime || !closure.endTime)) {
    return [];
  }

  if (absences.some((absence) => !absence.startTime || !absence.endTime)) {
    return [];
  }

  const baseRange = toRange(workingStartTime, workingEndTime);
  const blockedRanges: TimeRangeMinutes[] = [];

  if (breakStart && breakEnd) {
    blockedRanges.push(toRange(breakStart, breakEnd));
  }

  if (minimumStartTime) {
    blockedRanges.push({
      start: 0,
      end: parseTimeToMinutes(minimumStartTime),
    });
  }

  for (const closure of closures) {
    blockedRanges.push(
      toRange(closure.startTime as string, closure.endTime as string),
    );
  }

  for (const absence of absences) {
    blockedRanges.push(
      toRange(absence.startTime as string, absence.endTime as string),
    );
  }

  for (const appointment of appointments) {
    if (appointment.status !== "CONFIRMED") {
      continue;
    }

    blockedRanges.push(toRange(appointment.startTime, appointment.endTime));
  }

  const mergedBlockedRanges = normalizeRanges(blockedRanges);
  const availableRanges = mergedBlockedRanges.reduce<TimeRangeMinutes[]>(
    (windows, blockedRange) => subtractBlockedRange(windows, blockedRange),
    [baseRange],
  );

  return availableRanges
    .filter(
      (windowRange) =>
        windowRange.end - windowRange.start >= serviceDurationMinutes,
    )
    .map(toWindow);
}

export function isStartTimeWithinAvailabilityWindows(params: {
  windows: AvailabilityWindow[];
  startTime: string;
  durationMinutes: number;
}): boolean {
  const { windows, startTime, durationMinutes } = params;
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;

  return windows.some((windowRange) => {
    const windowStartMinutes = parseTimeToMinutes(windowRange.startTime);
    const windowEndMinutes = parseTimeToMinutes(windowRange.endTime);

    return startMinutes >= windowStartMinutes && endMinutes <= windowEndMinutes;
  });
}
