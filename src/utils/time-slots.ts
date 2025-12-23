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
 * Use this for dates created locally (e.g., from DatePicker).
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object to "YYYY-MM-DD" string using UTC.
 * Use this for dates coming from Prisma with @db.Date, which returns
 * dates at 00:00:00 UTC. Using local methods would shift the date
 * in negative timezones (e.g., BRT GMT-3: 00:00 UTC = 21:00 previous day).
 */
export function formatPrismaDateToString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
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

/**
 * Brazil timezone for business hours calculations.
 * All time comparisons should use this timezone since
 * working hours are defined in Brazilian local time.
 */
const BRAZIL_TIMEZONE = "America/Sao_Paulo";

/**
 * Gets current time in Brazil timezone
 */
function getBrazilTime(): { hours: number; minutes: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hours = Number.parseInt(
    parts.find((p) => p.type === "hour")?.value || "0",
    10,
  );
  const minutes = Number.parseInt(
    parts.find((p) => p.type === "minute")?.value || "0",
    10,
  );

  return { hours, minutes };
}

/**
 * Gets current date components in Brazil timezone
 */
function getBrazilDate(): { year: number; month: number; day: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(now);
  const year = Number.parseInt(
    parts.find((p) => p.type === "year")?.value || "0",
    10,
  );
  const month = Number.parseInt(
    parts.find((p) => p.type === "month")?.value || "0",
    10,
  );
  const day = Number.parseInt(
    parts.find((p) => p.type === "day")?.value || "0",
    10,
  );

  return { year, month, day };
}

/**
 * Gets current date in Brazil timezone as "YYYY-MM-DD" string.
 * Useful for comparing with dates formatted using formatPrismaDateToString.
 */
export function getBrazilDateString(): string {
  const { year, month, day } = getBrazilDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Creates a UTC midnight Date object for today in Brazil timezone.
 * This is essential for database queries against Prisma @db.Date fields,
 * which store dates at UTC 00:00:00.
 *
 * Example: If it's Dec 23 at 22:00 BRT (Dec 24 01:00 UTC),
 * we want to query for Dec 23 UTC midnight, not Dec 24 UTC midnight.
 *
 * @returns Date object representing today's date at UTC 00:00:00
 */
export function getTodayUTCMidnight(): Date {
  const { year, month, day } = getBrazilDate();
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Parses a date string "YYYY-MM-DD" to a UTC midnight Date object.
 * Use this when creating dates for database queries against Prisma @db.Date fields.
 *
 * Unlike parseDateString (which creates local dates), this ensures the Date
 * object represents the exact UTC midnight for the given date, matching
 * how Prisma stores @db.Date values.
 */
export function parseDateStringToUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Checks if the given date is today in Brazil timezone.
 * This is important because the server may run in UTC,
 * but business hours are defined in Brazilian local time.
 */
export function isToday(date: Date): boolean {
  const brazilToday = getBrazilDate();

  // The date parameter comes from parseDateString which creates a local date
  // We need to compare the date's components with Brazil's current date
  return (
    date.getFullYear() === brazilToday.year &&
    date.getMonth() + 1 === brazilToday.month &&
    date.getDate() === brazilToday.day
  );
}

/**
 * Gets current time in minutes since midnight (Brazil timezone).
 * This ensures slot filtering works correctly regardless of
 * where the server is running (e.g., Vercel runs in UTC).
 */
export function getCurrentTimeInMinutes(): number {
  const { hours, minutes } = getBrazilTime();
  return hours * 60 + minutes;
}

/**
 * Filters out time slots that have already passed for today.
 * If the date is not today, returns all slots unchanged.
 *
 * @param slots - List of time slots to filter
 * @param date - The date being checked
 * @returns Filtered slots with past times marked as unavailable
 */
export function filterPastSlots(slots: TimeSlot[], date: Date): TimeSlot[] {
  if (!isToday(date)) {
    return slots;
  }

  const currentMinutes = getCurrentTimeInMinutes();

  return slots.map((slot) => {
    const slotMinutes = parseTimeToMinutes(slot.time);

    // If slot time has already passed, mark as unavailable
    if (slotMinutes <= currentMinutes) {
      return {
        ...slot,
        available: false,
      };
    }

    return slot;
  });
}

/**
 * Checks if a given date and time is in the past (Brazil timezone).
 * This function compares the appointment date/time with the current
 * Brazilian time to ensure correct validation regardless of server timezone.
 */
export function isDateTimeInPast(date: Date, time: string): boolean {
  const brazilDate = getBrazilDate();
  const brazilTime = getBrazilTime();

  const [appointmentHours, appointmentMinutes] = time.split(":").map(Number);
  const appointmentYear = date.getFullYear();
  const appointmentMonth = date.getMonth() + 1;
  const appointmentDay = date.getDate();

  // Compare dates first
  if (appointmentYear < brazilDate.year) return true;
  if (appointmentYear > brazilDate.year) return false;

  if (appointmentMonth < brazilDate.month) return true;
  if (appointmentMonth > brazilDate.month) return false;

  if (appointmentDay < brazilDate.day) return true;
  if (appointmentDay > brazilDate.day) return false;

  // Same day - compare times
  const appointmentMinutesSinceMidnight =
    appointmentHours * 60 + appointmentMinutes;
  const currentMinutesSinceMidnight =
    brazilTime.hours * 60 + brazilTime.minutes;

  return appointmentMinutesSinceMidnight <= currentMinutesSinceMidnight;
}
