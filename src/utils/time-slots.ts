import type { TimeSlot } from "@/types/booking";

/**
 * Parses a date string "YYYY-MM-DD" to a Date object in local timezone.
 * This avoids timezone issues that occur when using `new Date("2025-12-15")`
 * which interprets the string as UTC, potentially returning wrong dayOfWeek.
 *
 * @example
 * // new Date("2025-12-15").getDay() = 0 (wrong - UTC interpretation)
 * // parseDateString("2025-12-15").getDay() = 1 (correct - local timezone)
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a Date object to "YYYY-MM-DD" string in local timezone.
 * This is the inverse of parseDateString and avoids timezone issues
 * that occur with toISOString().split("T")[0].
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a time string "HH:MM" to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to "HH:MM" format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Adds duration in minutes to a time string
 */
export function addMinutesToTime(time: string, duration: number): string {
  const minutes = parseTimeToMinutes(time);
  return minutesToTime(minutes + duration);
}

/**
 * Checks if a time falls within a break period
 */
export function isInBreakPeriod(
  time: string,
  breakStart: string | null,
  breakEnd: string | null,
): boolean {
  if (!breakStart || !breakEnd) return false;

  const timeMinutes = parseTimeToMinutes(time);
  const breakStartMinutes = parseTimeToMinutes(breakStart);
  const breakEndMinutes = parseTimeToMinutes(breakEnd);

  return timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes;
}

export interface GenerateTimeSlotsOptions {
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  duration: number; // slot duration in minutes (default 30)
  breakStart?: string | null;
  breakEnd?: string | null;
}

/**
 * Generates time slots between start and end time, excluding break periods
 * Each slot is marked as available by default
 */
export function generateTimeSlots(
  options: GenerateTimeSlotsOptions,
): TimeSlot[] {
  const {
    startTime,
    endTime,
    duration = 30,
    breakStart = null,
    breakEnd = null,
  } = options;

  const slots: TimeSlot[] = [];
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  for (
    let current = startMinutes;
    current + duration <= endMinutes;
    current += duration
  ) {
    const time = minutesToTime(current);

    // Skip slots that fall within break period
    if (isInBreakPeriod(time, breakStart, breakEnd)) {
      continue;
    }

    // Also skip if the slot would end during break
    if (breakStart && breakEnd) {
      const slotEndMinutes = current + duration;
      const breakStartMinutes = parseTimeToMinutes(breakStart);
      // If slot ends after break starts but starts before break, skip
      if (slotEndMinutes > breakStartMinutes && current < breakStartMinutes) {
        continue;
      }
    }

    slots.push({
      time,
      available: true,
    });
  }

  return slots;
}

export interface ExistingAppointment {
  startTime: string;
  endTime: string;
  status: string;
}

/**
 * Filters available slots by removing those that conflict with existing appointments.
 * Only considers CONFIRMED appointments as conflicts.
 * Takes into account the service duration to check if the entire slot would fit.
 *
 * @param slots - List of potential time slots
 * @param existingAppointments - List of existing appointments
 * @param serviceDuration - Duration of the service in minutes (used to check full slot availability)
 */
export function filterAvailableSlots(
  slots: TimeSlot[],
  existingAppointments: ExistingAppointment[],
  serviceDuration?: number,
): TimeSlot[] {
  const confirmedAppointments = existingAppointments.filter(
    (apt) => apt.status === "CONFIRMED",
  );

  return slots.map((slot) => {
    const slotStartMinutes = parseTimeToMinutes(slot.time);
    // If serviceDuration provided, calculate slot end; otherwise just check start time
    const slotEndMinutes = serviceDuration
      ? slotStartMinutes + serviceDuration
      : slotStartMinutes + 1; // +1 to just check the start point

    // Check if this slot conflicts with any existing appointment
    // Two intervals [A, B) and [C, D) overlap if A < D AND C < B
    const hasConflict = confirmedAppointments.some((apt) => {
      const aptStartMinutes = parseTimeToMinutes(apt.startTime);
      const aptEndMinutes = parseTimeToMinutes(apt.endTime);

      // Check for overlap: slot [slotStart, slotEnd) vs appointment [aptStart, aptEnd)
      return (
        slotStartMinutes < aptEndMinutes && aptStartMinutes < slotEndMinutes
      );
    });

    return {
      ...slot,
      available: slot.available && !hasConflict,
    };
  });
}

/**
 * Gets only available slots from a list
 */
export function getAvailableSlots(slots: TimeSlot[]): TimeSlot[] {
  return slots.filter((slot) => slot.available);
}
