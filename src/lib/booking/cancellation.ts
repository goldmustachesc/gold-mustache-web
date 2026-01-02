export const CANCELLATION_BLOCK_WINDOW_MINUTES = 2 * 60;

/**
 * @deprecated Use canClientCancelOutsideWindow for the new blocking behavior
 * Cancellation is allowed as long as the appointment hasn't started yet.
 * `minutesUntilAppointment` is expected to be relative to "now" (Brazil timezone business clock).
 */
export function canCancelBeforeStart(minutesUntilAppointment: number): boolean {
  return minutesUntilAppointment > 0;
}

/**
 * Client cancellation is BLOCKED when within the cancellation window (default: 2 hours).
 * Returns true only if there's more than `blockWindowMinutes` until the appointment.
 */
export function canClientCancelOutsideWindow(
  minutesUntilAppointment: number,
  blockWindowMinutes: number = CANCELLATION_BLOCK_WINDOW_MINUTES,
): boolean {
  return minutesUntilAppointment > blockWindowMinutes;
}

/**
 * Checks if a cancellation is within the blocked window (less than 2h before).
 * Used to show appropriate messaging to clients.
 */
export function isCancellationBlocked(
  minutesUntilAppointment: number,
  blockWindowMinutes: number = CANCELLATION_BLOCK_WINDOW_MINUTES,
): boolean {
  return (
    minutesUntilAppointment > 0 && minutesUntilAppointment <= blockWindowMinutes
  );
}

/**
 * @deprecated No longer needed - cancellation is now blocked, not just warned
 * Late cancellation warning (no hard block).
 */
export function shouldWarnLateCancellation(
  minutesUntilAppointment: number,
  warningWindowMinutes: number = CANCELLATION_BLOCK_WINDOW_MINUTES,
): boolean {
  return (
    minutesUntilAppointment > 0 &&
    minutesUntilAppointment < warningWindowMinutes
  );
}

// ============================================
// Frontend Helper Functions
// ============================================

/**
 * Returns cancellation status for an appointment.
 * Use this in frontend components to determine if an appointment can be cancelled.
 *
 * @param minutesUntilAppointment - Minutes until the appointment starts
 * @returns Object with `canCancel` and `isBlocked` flags
 */
export function getAppointmentCancellationStatus(
  minutesUntilAppointment: number,
): { canCancel: boolean; isBlocked: boolean } {
  return {
    canCancel: canClientCancelOutsideWindow(minutesUntilAppointment),
    isBlocked: isCancellationBlocked(minutesUntilAppointment),
  };
}
