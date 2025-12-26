export const CANCELLATION_WARNING_WINDOW_MINUTES = 2 * 60;

/**
 * Cancellation is allowed as long as the appointment hasn't started yet.
 * `minutesUntilAppointment` is expected to be relative to "now" (Brazil timezone business clock).
 */
export function canCancelBeforeStart(minutesUntilAppointment: number): boolean {
  return minutesUntilAppointment > 0;
}

/**
 * Late cancellation warning (no hard block).
 */
export function shouldWarnLateCancellation(
  minutesUntilAppointment: number,
  warningWindowMinutes: number = CANCELLATION_WARNING_WINDOW_MINUTES,
): boolean {
  return (
    minutesUntilAppointment > 0 &&
    minutesUntilAppointment < warningWindowMinutes
  );
}
