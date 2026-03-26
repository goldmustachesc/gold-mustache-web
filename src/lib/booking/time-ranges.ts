import { parseTimeToMinutes } from "@/utils/time-slots";

export type TimeRangeMinutes = { start: number; end: number };

export function toTimeRangeMinutes(
  startTime: string,
  endTime: string,
): TimeRangeMinutes {
  return {
    start: parseTimeToMinutes(startTime),
    end: parseTimeToMinutes(endTime),
  };
}

export function rangesOverlap(
  a: TimeRangeMinutes,
  b: TimeRangeMinutes,
): boolean {
  // Two intervals [A, B) and [C, D) overlap if A < D AND C < B
  return a.start < b.end && b.start < a.end;
}

export function isRangeWithin(
  needle: TimeRangeMinutes,
  haystack: TimeRangeMinutes,
): boolean {
  return needle.start >= haystack.start && needle.end <= haystack.end;
}

export function slotToRangeMinutes(
  slotStartTime: string,
  durationMinutes: number,
): TimeRangeMinutes {
  const start = parseTimeToMinutes(slotStartTime);
  return { start, end: start + durationMinutes };
}
