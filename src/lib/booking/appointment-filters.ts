import type { AppointmentWithDetails } from "@/types/booking";
import { getMinutesUntilAppointment } from "@/utils/time-slots";

export function isPastOrStarted(apt: AppointmentWithDetails): boolean {
  return getMinutesUntilAppointment(apt.date, apt.startTime) <= 0;
}

export function filterAppointments(
  appointments: AppointmentWithDetails[] | undefined,
): { upcoming: AppointmentWithDetails[]; history: AppointmentWithDetails[] } {
  if (!appointments) return { upcoming: [], history: [] };

  const upcoming: AppointmentWithDetails[] = [];
  const history: AppointmentWithDetails[] = [];

  for (const apt of appointments) {
    if (apt.status === "CONFIRMED" && !isPastOrStarted(apt)) {
      upcoming.push(apt);
    } else {
      history.push(apt);
    }
  }

  return { upcoming, history };
}
