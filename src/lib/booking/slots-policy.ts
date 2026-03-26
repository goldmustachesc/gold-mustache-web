import { generateTimeSlots } from "@/utils/time-slots";
import {
  isRangeWithin,
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
 * - If it is within working hours but not aligned to the generated slots grid (including break rules)
 *   => SLOT_UNAVAILABLE
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

  const generated = generateTimeSlots({
    startTime: workingStartTime,
    endTime: workingEndTime,
    duration: durationMinutes,
    breakStart,
    breakEnd,
  });

  if (!generated.some((s) => s.time === startTime)) {
    return "SLOT_UNAVAILABLE";
  }

  return null;
}
