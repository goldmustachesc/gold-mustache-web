import { addMinutesToTime } from "@/utils/time-slots";

/**
 * Calculates the end time ("HH:mm") given a start time ("HH:mm") and duration in minutes.
 *
 * Note: This mirrors our current booking behavior and does not clamp to 24h,
 * because appointments are constrained by working hours.
 */
export function calculateEndTime(
  startTime: string,
  durationMinutes: number,
): string {
  return addMinutesToTime(startTime, durationMinutes);
}
