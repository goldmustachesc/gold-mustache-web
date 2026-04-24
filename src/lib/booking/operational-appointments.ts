import type { AppointmentWithDetails } from "@/types/booking";

function isMoreRecentSlotUpdate(
  candidate: AppointmentWithDetails,
  current: AppointmentWithDetails,
): boolean {
  const candidateUpdatedAt = Date.parse(candidate.updatedAt);
  const currentUpdatedAt = Date.parse(current.updatedAt);

  if (candidateUpdatedAt !== currentUpdatedAt) {
    return candidateUpdatedAt > currentUpdatedAt;
  }

  return Date.parse(candidate.createdAt) > Date.parse(current.createdAt);
}

export function consolidateOperationalAppointments(
  appointments: AppointmentWithDetails[],
): AppointmentWithDetails[] {
  const latestBySlot = new Map<string, AppointmentWithDetails>();

  for (const appointment of appointments) {
    const slotKey = `${appointment.date}:${appointment.startTime}`;
    const current = latestBySlot.get(slotKey);

    if (!current || isMoreRecentSlotUpdate(appointment, current)) {
      latestBySlot.set(slotKey, appointment);
    }
  }

  return [...latestBySlot.values()].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    return left.startTime.localeCompare(right.startTime);
  });
}
