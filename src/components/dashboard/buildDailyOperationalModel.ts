import type {
  AppointmentWithDetails,
  BarberAbsenceData,
  BarberWorkingHoursDay,
} from "@/types/booking";
import { buildAbsenceRecurrenceSummary } from "@/lib/barber-absence-recurrence";
import { minutesToTime, parseTimeToMinutes } from "@/utils/time-slots";

function isFullDayAbsence(absence: BarberAbsenceData): boolean {
  return !absence.startTime || !absence.endTime;
}

function coversEntireWorkingDay(
  absence: BarberAbsenceData,
  workingHours: BarberWorkingHoursDay | null | undefined,
): boolean {
  if (
    !workingHours?.isWorking ||
    !workingHours.startTime ||
    !workingHours.endTime ||
    !absence.startTime ||
    !absence.endTime
  ) {
    return false;
  }

  return (
    parseTimeToMinutes(absence.startTime) <=
      parseTimeToMinutes(workingHours.startTime) &&
    parseTimeToMinutes(absence.endTime) >=
      parseTimeToMinutes(workingHours.endTime)
  );
}

export type OperationalScheduleSlot = {
  time: string;
  endTime: string;
  appointment: null;
  isAvailable: boolean;
  isBlockedByAbsence: boolean;
  absenceReason: string | null;
  absenceRecurrenceSummary: string | null;
};

export type CompactTimelineItem =
  | {
      type: "appointment";
      sortMinutes: number;
      startTime: string;
      appointment: AppointmentWithDetails;
    }
  | {
      type: "slot";
      sortMinutes: number;
      startTime: string;
      slot: OperationalScheduleSlot;
    };

export type DailyHeroKind =
  | "current-appointment"
  | "next-appointment"
  | "available-slot"
  | "day-off"
  | "blocked-day"
  | "unconfigured-hours"
  | "free-day";

export type DailyHeroState = {
  kind: DailyHeroKind;
  /** Horário principal para o foco do dia (início do atendimento, lacuna, etc.) */
  primaryTime: string | null;
  appointmentId: string | null;
};

export type BuildDailyOperationalModelInput = {
  selectedDate: string;
  currentDate: string;
  currentTime: string;
  appointments: AppointmentWithDetails[];
  absences: BarberAbsenceData[];
  workingHours: BarberWorkingHoursDay | null | undefined;
};

export type DailyOperationalModel = {
  fullDayAbsence: BarberAbsenceData | null;
  partialDayAbsences: Array<
    BarberAbsenceData & { startTime: string; endTime: string }
  >;
  hasFullDayAbsence: boolean;
  hasPartialAbsences: boolean;
  isDayOff: boolean;
  hasConfiguredWorkingHours: boolean;
  availabilitySlots: OperationalScheduleSlot[];
  sortedAppointments: AppointmentWithDetails[];
  timelineItems: CompactTimelineItem[];
  timelineByHour: Record<string, CompactTimelineItem[]>;
  timelineHours: string[];
  availableSlotCount: number;
  /** Primeira lacuna livre (não bloqueada por ausência), a partir do horário atual quando o dia selecionado é hoje */
  firstAvailableSlot: OperationalScheduleSlot | null;
  hero: DailyHeroState;
};

function isConfirmed(appointment: AppointmentWithDetails): boolean {
  return appointment.status === "CONFIRMED";
}

function buildAvailabilitySlots(params: {
  workingHours: BarberWorkingHoursDay | null | undefined;
  appointments: AppointmentWithDetails[];
  hasFullDayAbsence: boolean;
  partialDayAbsences: Array<
    BarberAbsenceData & { startTime: string; endTime: string }
  >;
}): OperationalScheduleSlot[] {
  const { workingHours, appointments, hasFullDayAbsence, partialDayAbsences } =
    params;

  if (hasFullDayAbsence) {
    return [];
  }

  if (
    !workingHours ||
    !workingHours.isWorking ||
    !workingHours.startTime ||
    !workingHours.endTime
  ) {
    return [];
  }

  const dayAppointments = [...appointments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const occupyingAppointments = dayAppointments.filter(isConfirmed);
  const workStart = parseTimeToMinutes(workingHours.startTime);
  const workEnd = parseTimeToMinutes(workingHours.endTime);
  const breakStartMinutes = workingHours.breakStart
    ? parseTimeToMinutes(workingHours.breakStart)
    : null;
  const breakEndMinutes = workingHours.breakEnd
    ? parseTimeToMinutes(workingHours.breakEnd)
    : null;
  const boundaries = new Set<number>([workStart, workEnd]);

  if (breakStartMinutes !== null && breakEndMinutes !== null) {
    boundaries.add(breakStartMinutes);
    boundaries.add(breakEndMinutes);
  }

  for (const appointment of occupyingAppointments) {
    const appointmentStart = parseTimeToMinutes(appointment.startTime);
    const appointmentEnd = parseTimeToMinutes(appointment.endTime);

    if (appointmentEnd <= workStart || appointmentStart >= workEnd) {
      continue;
    }

    boundaries.add(Math.max(appointmentStart, workStart));
    boundaries.add(Math.min(appointmentEnd, workEnd));
  }

  for (const absence of partialDayAbsences) {
    const absenceStart = parseTimeToMinutes(absence.startTime);
    const absenceEnd = parseTimeToMinutes(absence.endTime);

    if (absenceEnd <= workStart || absenceStart >= workEnd) {
      continue;
    }

    boundaries.add(Math.max(absenceStart, workStart));
    boundaries.add(Math.min(absenceEnd, workEnd));
  }

  const sortedBoundaries = [...boundaries]
    .filter((minutes) => minutes >= workStart && minutes <= workEnd)
    .sort((a, b) => a - b);
  const slots: OperationalScheduleSlot[] = [];

  for (let index = 0; index < sortedBoundaries.length - 1; index++) {
    const slotStart = sortedBoundaries[index];
    const slotEnd = sortedBoundaries[index + 1];

    if (slotEnd <= slotStart) {
      continue;
    }

    if (
      breakStartMinutes !== null &&
      breakEndMinutes !== null &&
      slotStart >= breakStartMinutes &&
      slotEnd <= breakEndMinutes
    ) {
      continue;
    }

    const overlapsAppointment = occupyingAppointments.some((appointment) => {
      const appointmentStart = parseTimeToMinutes(appointment.startTime);
      const appointmentEnd = parseTimeToMinutes(appointment.endTime);

      return slotStart < appointmentEnd && appointmentStart < slotEnd;
    });

    if (overlapsAppointment) {
      continue;
    }

    const blockingAbsence =
      partialDayAbsences.find((absence) => {
        const absenceStart = parseTimeToMinutes(absence.startTime);
        const absenceEnd = parseTimeToMinutes(absence.endTime);

        return slotStart < absenceEnd && absenceStart < slotEnd;
      }) ?? null;

    slots.push({
      time: minutesToTime(slotStart),
      endTime: minutesToTime(slotEnd),
      appointment: null,
      isAvailable: !blockingAbsence,
      isBlockedByAbsence: Boolean(blockingAbsence),
      absenceReason: blockingAbsence?.reason ?? null,
      absenceRecurrenceSummary: buildAbsenceRecurrenceSummary(
        blockingAbsence?.recurrence ?? null,
      ),
    });
  }

  return slots;
}

function buildHeroState(params: {
  selectedDate: string;
  currentDate: string;
  currentTime: string;
  hasFullDayAbsence: boolean;
  isDayOff: boolean;
  hasConfiguredWorkingHours: boolean;
  sortedAppointments: AppointmentWithDetails[];
  availabilitySlots: OperationalScheduleSlot[];
  timelineItems: CompactTimelineItem[];
}): DailyHeroState {
  const {
    selectedDate,
    currentDate,
    currentTime,
    hasFullDayAbsence,
    isDayOff,
    hasConfiguredWorkingHours,
    sortedAppointments,
    availabilitySlots,
    timelineItems,
  } = params;

  const currentMinutes = parseTimeToMinutes(currentTime);
  const viewingToday = selectedDate === currentDate;

  if (hasFullDayAbsence) {
    return {
      kind: "blocked-day",
      primaryTime: null,
      appointmentId: null,
    };
  }

  if (isDayOff) {
    return {
      kind: "day-off",
      primaryTime: null,
      appointmentId: null,
    };
  }

  if (!hasConfiguredWorkingHours) {
    return {
      kind: "unconfigured-hours",
      primaryTime: null,
      appointmentId: null,
    };
  }

  const confirmedInOrder = sortedAppointments.filter(isConfirmed);

  if (viewingToday) {
    const currentAppointment = confirmedInOrder.find((appointment) => {
      const start = parseTimeToMinutes(appointment.startTime);
      const end = parseTimeToMinutes(appointment.endTime);
      return currentMinutes >= start && currentMinutes < end;
    });

    if (currentAppointment) {
      return {
        kind: "current-appointment",
        primaryTime: currentAppointment.startTime,
        appointmentId: currentAppointment.id,
      };
    }

    const nextAppointment = confirmedInOrder.find((appointment) => {
      return parseTimeToMinutes(appointment.startTime) > currentMinutes;
    });

    if (nextAppointment) {
      return {
        kind: "next-appointment",
        primaryTime: nextAppointment.startTime,
        appointmentId: nextAppointment.id,
      };
    }

    const firstActionableSlot = availabilitySlots.find(
      (slot) =>
        slot.isAvailable && parseTimeToMinutes(slot.time) >= currentMinutes,
    );

    if (firstActionableSlot) {
      return {
        kind: "available-slot",
        primaryTime: firstActionableSlot.time,
        appointmentId: null,
      };
    }
  } else {
    const firstOfDay = confirmedInOrder[0];
    if (firstOfDay) {
      return {
        kind: "next-appointment",
        primaryTime: firstOfDay.startTime,
        appointmentId: firstOfDay.id,
      };
    }

    const firstSlot = availabilitySlots.find((slot) => slot.isAvailable);
    if (firstSlot) {
      return {
        kind: "available-slot",
        primaryTime: firstSlot.time,
        appointmentId: null,
      };
    }
  }

  if (timelineItems.length === 0) {
    return {
      kind: "free-day",
      primaryTime: null,
      appointmentId: null,
    };
  }

  return {
    kind: "free-day",
    primaryTime: null,
    appointmentId: null,
  };
}

export function buildDailyOperationalModel(
  input: BuildDailyOperationalModelInput,
): DailyOperationalModel {
  const {
    selectedDate,
    currentDate,
    currentTime,
    appointments,
    absences,
    workingHours,
  } = input;

  const fullDayAbsence =
    absences.find(isFullDayAbsence) ??
    absences.find((absence) => coversEntireWorkingDay(absence, workingHours)) ??
    null;
  const partialDayAbsences = absences.filter(
    (
      absence,
    ): absence is BarberAbsenceData & {
      startTime: string;
      endTime: string;
    } =>
      Boolean(absence.startTime && absence.endTime) &&
      absence.id !== fullDayAbsence?.id,
  );
  const hasFullDayAbsence = fullDayAbsence !== null;
  const hasPartialAbsences = partialDayAbsences.length > 0;
  const isDayOff = Boolean(workingHours && !workingHours.isWorking);
  const hasConfiguredWorkingHours = Boolean(
    workingHours?.isWorking && workingHours.startTime && workingHours.endTime,
  );

  const availabilitySlots = buildAvailabilitySlots({
    workingHours,
    appointments,
    hasFullDayAbsence,
    partialDayAbsences,
  });

  const sortedAppointments = [...appointments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  const timelineItems: CompactTimelineItem[] = [
    ...sortedAppointments.map(
      (appointment): CompactTimelineItem => ({
        type: "appointment",
        sortMinutes: parseTimeToMinutes(appointment.startTime),
        startTime: appointment.startTime,
        appointment,
      }),
    ),
    ...(!hasFullDayAbsence && !isDayOff && hasConfiguredWorkingHours
      ? availabilitySlots.map(
          (slot): CompactTimelineItem => ({
            type: "slot",
            sortMinutes: parseTimeToMinutes(slot.time),
            startTime: slot.time,
            slot,
          }),
        )
      : []),
  ].sort((left, right) => {
    if (left.sortMinutes !== right.sortMinutes) {
      return left.sortMinutes - right.sortMinutes;
    }
    return left.type === "appointment" ? -1 : 1;
  });

  const timelineByHour = timelineItems.reduce(
    (acc, item) => {
      const hour = item.startTime.split(":")[0];
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(item);
      return acc;
    },
    {} as Record<string, CompactTimelineItem[]>,
  );

  const timelineHours = Object.keys(timelineByHour).sort(
    (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
  );

  const availableSlotCount = availabilitySlots.filter(
    (slot) => slot.isAvailable,
  ).length;

  const viewingToday = selectedDate === currentDate;
  const currentMinutes = parseTimeToMinutes(currentTime);

  const firstAvailableSlot =
    availabilitySlots.find((slot) => {
      if (!slot.isAvailable) return false;
      if (viewingToday) {
        return parseTimeToMinutes(slot.time) >= currentMinutes;
      }
      return true;
    }) ?? null;

  const hero = buildHeroState({
    selectedDate,
    currentDate,
    currentTime,
    hasFullDayAbsence,
    isDayOff,
    hasConfiguredWorkingHours,
    sortedAppointments,
    availabilitySlots,
    timelineItems,
  });

  return {
    fullDayAbsence,
    partialDayAbsences,
    hasFullDayAbsence,
    hasPartialAbsences,
    isDayOff,
    hasConfiguredWorkingHours,
    availabilitySlots,
    sortedAppointments,
    timelineItems,
    timelineByHour,
    timelineHours,
    availableSlotCount,
    firstAvailableSlot,
    hero,
  };
}
