import {
  isRangeWithin,
  rangesOverlap,
  slotToRangeMinutes,
  toTimeRangeMinutes,
} from "./time-ranges";

export type WorkingHoursSlotError =
  | null
  | "BARBER_UNAVAILABLE"
  | "SLOT_UNAVAILABLE";

export type SlotBoundaryParams = {
  workingStartTime: string;
  workingEndTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  startTime: string;
  durationMinutes: number;
};

/**
 * Pure policy: validates if a given `startTime` is a valid slot boundary for a barber's working hours.
 *
 * Mirrors the service behavior:
 * - If the range [startTime, startTime+duration) is outside working hours => BARBER_UNAVAILABLE
 * - If it is within working hours but overlaps the break window => SLOT_UNAVAILABLE
 */
export function getWorkingHoursSlotError(
  params: SlotBoundaryParams,
): WorkingHoursSlotError {
  const {
    workingStartTime,
    workingEndTime,
    breakStart = null,
    breakEnd = null,
    startTime,
    durationMinutes,
  } = params;

  const slotRange = slotToRangeMinutes(startTime, durationMinutes);
  const workingRange = toTimeRangeMinutes(workingStartTime, workingEndTime);

  if (!isRangeWithin(slotRange, workingRange)) {
    return "BARBER_UNAVAILABLE";
  }

  if (breakStart && breakEnd) {
    const breakRange = toTimeRangeMinutes(breakStart, breakEnd);
    if (rangesOverlap(slotRange, breakRange)) {
      return "SLOT_UNAVAILABLE";
    }
  }

  return null;
}
