import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  canCancelBeforeStart,
  canClientCancelOutsideWindow,
  CANCELLATION_BLOCK_WINDOW_MINUTES,
  shouldWarnLateCancellation as shouldWarnLateCancellationCore,
} from "@/lib/booking/cancellation";
import { normalizePhoneDigits } from "@/lib/booking/phone";
import { calculateEndTime } from "@/lib/booking/time";
import { getWorkingHoursSlotError } from "@/lib/booking/slots-policy";
import {
  getAbsenceSlotError,
  getShopSlotError,
} from "@/lib/booking/availability-policy";
import { isSlotTooSoonForClient } from "@/lib/booking/lead-time";
import {
  generateTimeSlots,
  filterAvailableSlots,
  filterPastSlots,
  minutesToTime,
  parseDateString,
  parseDateStringToUTC,
  parseTimeToMinutes,
  formatDateToString,
  formatPrismaDateToString,
  isDateTimeInPast,
  getBrazilDateString,
  getCurrentBrazilMinutes,
  getTodayUTCMidnight,
  getMinutesUntilAppointment,
} from "@/utils/time-slots";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import type {
  BookingAvailability,
  ServiceData,
  TimeSlot,
  CreateAppointmentInput,
  CreateGuestAppointmentInput,
  CreateAppointmentByBarberInput,
  AppointmentWithDetails,
  DateRange,
} from "@/types/booking";
import { AppointmentStatus, type Prisma } from "@prisma/client";
import { isClientBanned } from "@/services/banned-client";
import { consolidateOperationalAppointments } from "@/lib/booking/operational-appointments";
import { buildAvailabilityWindows } from "@/lib/booking/availability-windows";

// ============================================
// Helper Functions
// ============================================

async function getBookingPolicyError(params: {
  barberId: string;
  appointmentDateLocal: Date;
  appointmentDateDb: Date;
  startTime: string;
  serviceDuration: number;
}): Promise<null | "SHOP_CLOSED" | "BARBER_UNAVAILABLE" | "SLOT_UNAVAILABLE"> {
  const {
    barberId,
    appointmentDateLocal,
    appointmentDateDb,
    startTime,
    serviceDuration,
  } = params;

  const dayOfWeek = appointmentDateLocal.getDay();

  const shopHoursSelect = {
    isOpen: true,
    startTime: true,
    endTime: true,
    breakStart: true,
    breakEnd: true,
  } as const;
  const workingHoursSelect = {
    startTime: true,
    endTime: true,
    breakStart: true,
    breakEnd: true,
  } as const;

  const [shopHours, workingHours, shopClosures, absences] = await Promise.all([
    prisma.shopHours.findUnique({
      where: { dayOfWeek },
      select: shopHoursSelect,
    }),
    prisma.workingHours.findUnique({
      where: { barberId_dayOfWeek: { barberId, dayOfWeek } },
      select: workingHoursSelect,
    }),
    prisma.shopClosure.findMany({
      where: { date: appointmentDateDb },
      select: { startTime: true, endTime: true },
    }),
    prisma.barberAbsence.findMany({
      where: { barberId, date: appointmentDateDb },
      select: { startTime: true, endTime: true },
    }),
  ]);

  if (
    !shopHours ||
    !shopHours.isOpen ||
    !shopHours.startTime ||
    !shopHours.endTime
  ) {
    return "SHOP_CLOSED";
  }

  const effectiveHours = workingHours
    ? {
        startTime: workingHours.startTime,
        endTime: workingHours.endTime,
        breakStart: workingHours.breakStart,
        breakEnd: workingHours.breakEnd,
      }
    : {
        startTime: shopHours.startTime,
        endTime: shopHours.endTime,
        breakStart: shopHours.breakStart,
        breakEnd: shopHours.breakEnd,
      };

  const workingHoursError = getWorkingHoursSlotError({
    workingStartTime: effectiveHours.startTime,
    workingEndTime: effectiveHours.endTime,
    breakStart: effectiveHours.breakStart,
    breakEnd: effectiveHours.breakEnd,
    startTime,
    durationMinutes: serviceDuration,
  });
  if (workingHoursError) return workingHoursError;

  const shopError = getShopSlotError({
    slotStartTime: startTime,
    durationMinutes: serviceDuration,
    shopHours,
    closures: shopClosures,
  });
  if (shopError) return shopError;

  const absenceError = getAbsenceSlotError({
    slotStartTime: startTime,
    durationMinutes: serviceDuration,
    absences,
  });
  if (absenceError) return absenceError;

  return null;
}

function isServiceAvailableForBarber(
  service: {
    active?: boolean;
    barbers?: Array<{ barberId: string }>;
  } | null,
  barberId: string,
): service is {
  active?: boolean;
  barbers?: Array<{ barberId: string }>;
  duration: number;
} {
  if (!service) return false;
  if (service.active === false) return false;

  if (Array.isArray(service.barbers)) {
    return service.barbers.some(
      (barberService) => barberService.barberId === barberId,
    );
  }

  return true;
}

async function isPhoneLinkedToBannedProfile(phone: string): Promise<boolean> {
  const normalizedPhone = normalizePhoneDigits(phone);

  if (!normalizedPhone) {
    return false;
  }

  const bannedProfiles = await prisma.profile.findMany({
    where: {
      phone: { not: null },
      bannedClient: { isNot: null },
    },
    select: { phone: true },
  });

  return bannedProfiles.some(
    (profile) => normalizePhoneDigits(profile.phone ?? "") === normalizedPhone,
  );
}

async function lockBarberDateForBooking(
  tx: Pick<Prisma.TransactionClient, "$executeRaw">,
  barberId: string,
  appointmentDateDb: Date,
): Promise<void> {
  // Advisory lock scoped to this transaction.
  // Goal: serialize "overlap check + appointment create" for the same barber+date,
  // preventing concurrent overlapping bookings without introducing a new table.
  const dateKey = formatPrismaDateToString(appointmentDateDb);
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${barberId}), hashtext(${dateKey}))
  `;
}

/**
 * Checks if a new appointment time range overlaps with any existing confirmed appointments.
 * Two time ranges [A, B) and [C, D) overlap if: A < D AND C < B
 *
 * IMPORTANT: this function by itself is NOT atomic.
 * To fully prevent concurrent overlaps, call it inside a DB transaction with a lock
 * (see `lockBarberDateForBooking`) and create the appointment in the same transaction.
 *
 * @example
 * // 45-min service at 09:45-10:30 vs 30-min service at 10:00-10:30
 * // These would overlap because 09:45 < 10:30 AND 10:00 < 10:30
 */
async function hasOverlappingAppointment(
  db: Pick<Prisma.TransactionClient, "appointment">,
  barberId: string,
  appointmentDate: Date,
  newStartTime: string,
  newEndTime: string,
): Promise<boolean> {
  // Fetch all confirmed appointments for this barber on this date
  const existingAppointments = await db.appointment.findMany({
    where: {
      barberId,
      date: appointmentDate,
      status: AppointmentStatus.CONFIRMED,
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const newStartMinutes = parseTimeToMinutes(newStartTime);
  const newEndMinutes = parseTimeToMinutes(newEndTime);

  // Check for overlap with each existing appointment
  return existingAppointments.some((apt) => {
    const aptStartMinutes = parseTimeToMinutes(apt.startTime);
    const aptEndMinutes = parseTimeToMinutes(apt.endTime);

    // Two intervals [A, B) and [C, D) overlap if A < D AND C < B
    return newStartMinutes < aptEndMinutes && aptStartMinutes < newEndMinutes;
  });
}

// ============================================
// Service Functions
// ============================================

/**
 * Get all active services, optionally filtered by barber
 */
export async function getServices(barberId?: string): Promise<ServiceData[]> {
  const where = barberId
    ? {
        active: true,
        barbers: {
          some: {
            barberId,
          },
        },
      }
    : { active: true };

  const services = await prisma.service.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      duration: true,
      price: true,
      active: true,
    },
  });

  return services.map((service) => ({
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    duration: service.duration,
    price: Number(service.price),
    active: service.active,
  }));
}

// ============================================
// Slot Functions
// ============================================

/**
 * Get available time slots for a specific date, barber and service.
 * Slots are generated based on the service duration to ensure perfect scheduling.
 * Falls back to shop hours if the barber hasn't configured their own working hours.
 */
export interface GetAvailableSlotsOptions {
  applyLeadTime?: boolean;
}

type BookingAvailabilityContext = {
  dateStr: string;
  businessDate: Date;
  service: {
    duration: number;
    active?: boolean;
    barbers?: Array<{ barberId: string }>;
  } | null;
  shopHours: {
    isOpen: boolean;
    startTime: string | null;
    endTime: string | null;
    breakStart?: string | null;
    breakEnd?: string | null;
  } | null;
  shopClosures: Array<{ startTime: string | null; endTime: string | null }>;
  absences: Array<{ startTime: string | null; endTime: string | null }>;
  workingHours: {
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
  } | null;
  existingAppointments: Array<{
    startTime: string;
    endTime: string;
    status: AppointmentStatus;
  }>;
};

async function loadBookingAvailabilityContext(
  date: Date,
  barberId: string,
  serviceId: string,
): Promise<BookingAvailabilityContext> {
  const dateStr = formatDateToString(date);
  const businessDate = parseIsoDateYyyyMmDdAsSaoPauloDate(dateStr);
  const dayOfWeek = businessDate.getUTCDay();
  const dateForDb = parseDateStringToUTC(dateStr);

  const [
    service,
    shopHours,
    shopClosures,
    absences,
    workingHours,
    existingAppointments,
  ] = await Promise.all([
    prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        duration: true,
        active: true,
        barbers: { select: { barberId: true } },
      },
    }),
    prisma.shopHours.findUnique({
      where: { dayOfWeek },
      select: {
        isOpen: true,
        startTime: true,
        endTime: true,
        breakStart: true,
        breakEnd: true,
      },
    }),
    prisma.shopClosure.findMany({
      where: { date: dateForDb },
      select: { startTime: true, endTime: true },
    }),
    prisma.barberAbsence.findMany({
      where: { barberId, date: dateForDb },
      select: { startTime: true, endTime: true },
    }),
    prisma.workingHours.findUnique({
      where: { barberId_dayOfWeek: { barberId, dayOfWeek } },
      select: {
        startTime: true,
        endTime: true,
        breakStart: true,
        breakEnd: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        barberId,
        date: dateForDb,
        status: AppointmentStatus.CONFIRMED,
      },
      select: { startTime: true, endTime: true, status: true },
    }),
  ]);

  return {
    dateStr,
    businessDate,
    service,
    shopHours,
    shopClosures,
    absences,
    workingHours,
    existingAppointments,
  };
}

function getEmptyBookingAvailability(
  barberId: string,
  serviceDuration = 0,
): BookingAvailability {
  return {
    barberId,
    serviceDuration,
    windows: [],
  };
}

export async function getBookingAvailability(
  date: Date,
  barberId: string,
  serviceId: string,
  options: GetAvailableSlotsOptions = {},
): Promise<BookingAvailability> {
  const { applyLeadTime = false } = options;
  const {
    dateStr,
    service,
    shopHours,
    shopClosures,
    absences,
    workingHours,
    existingAppointments,
  } = await loadBookingAvailabilityContext(date, barberId, serviceId);

  if (!isServiceAvailableForBarber(service, barberId)) {
    return getEmptyBookingAvailability(barberId);
  }

  if (
    !shopHours ||
    !shopHours.isOpen ||
    !shopHours.startTime ||
    !shopHours.endTime
  ) {
    return getEmptyBookingAvailability(barberId, service.duration);
  }

  const effectiveHours = workingHours
    ? {
        startTime: workingHours.startTime,
        endTime: workingHours.endTime,
        breakStart: workingHours.breakStart,
        breakEnd: workingHours.breakEnd,
      }
    : {
        startTime: shopHours.startTime,
        endTime: shopHours.endTime,
        breakStart: shopHours.breakStart,
        breakEnd: shopHours.breakEnd,
      };

  const minimumStartMinutes =
    dateStr === getBrazilDateString()
      ? getCurrentBrazilMinutes() + (applyLeadTime ? 60 : 0)
      : null;

  if (minimumStartMinutes !== null && minimumStartMinutes >= 24 * 60) {
    return getEmptyBookingAvailability(barberId, service.duration);
  }

  return {
    barberId,
    serviceDuration: service.duration,
    windows: buildAvailabilityWindows({
      workingStartTime: effectiveHours.startTime,
      workingEndTime: effectiveHours.endTime,
      breakStart: effectiveHours.breakStart,
      breakEnd: effectiveHours.breakEnd,
      serviceDurationMinutes: service.duration,
      closures: shopClosures,
      absences,
      appointments: existingAppointments,
      minimumStartTime:
        minimumStartMinutes === null
          ? null
          : minutesToTime(minimumStartMinutes),
    }),
  };
}

export async function getAvailableSlots(
  date: Date,
  barberId: string,
  serviceId: string,
  options: GetAvailableSlotsOptions = {},
): Promise<TimeSlot[]> {
  const { applyLeadTime = false } = options;
  const {
    dateStr,
    businessDate,
    service,
    shopHours,
    shopClosures,
    absences,
    workingHours,
    existingAppointments,
  } = await loadBookingAvailabilityContext(date, barberId, serviceId);

  if (!isServiceAvailableForBarber(service, barberId)) return [];

  if (
    !shopHours ||
    !shopHours.isOpen ||
    !shopHours.startTime ||
    !shopHours.endTime
  ) {
    return [];
  }

  if (shopClosures.some((c) => !c.startTime || !c.endTime)) return [];
  if (absences.some((a) => !a.startTime || !a.endTime)) return [];

  const effectiveHours = workingHours
    ? {
        startTime: workingHours.startTime,
        endTime: workingHours.endTime,
        breakStart: workingHours.breakStart,
        breakEnd: workingHours.breakEnd,
      }
    : {
        startTime: shopHours.startTime,
        endTime: shopHours.endTime,
        breakStart: shopHours.breakStart,
        breakEnd: shopHours.breakEnd,
      };

  // Generate slots based on service duration
  const allSlots = generateTimeSlots({
    startTime: effectiveHours.startTime,
    endTime: effectiveHours.endTime,
    duration: service.duration,
    breakStart: effectiveHours.breakStart,
    breakEnd: effectiveHours.breakEnd,
  });

  const policySlots = allSlots.filter((slot) => {
    const shopError = getShopSlotError({
      slotStartTime: slot.time,
      durationMinutes: service.duration,
      shopHours,
      closures: shopClosures,
    });
    if (shopError) return false;

    const absenceError = getAbsenceSlotError({
      slotStartTime: slot.time,
      durationMinutes: service.duration,
      absences,
    });
    if (absenceError) return false;

    return true;
  });

  // Filter out slots that would conflict with existing appointments
  const availableSlots = filterAvailableSlots(
    policySlots,
    existingAppointments.map((apt) => ({
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
    })),
    service.duration,
  );

  // Filter out slots that have already passed (for today)
  const validSlots = filterPastSlots(availableSlots, businessDate);

  if (applyLeadTime) {
    return validSlots.map((slot) => {
      if (!slot.available) return { ...slot, barberId };
      const minutesUntil = getMinutesUntilAppointment(dateStr, slot.time);
      return {
        ...slot,
        available: !isSlotTooSoonForClient(minutesUntil),
        barberId,
      };
    });
  }

  return validSlots.map((slot) => ({
    ...slot,
    barberId,
  }));
}

// ============================================
// Appointment Functions
// ============================================

/**
 * Create a new appointment
 */
export async function createAppointment(
  input: CreateAppointmentInput,
  clientId: string,
): Promise<AppointmentWithDetails> {
  const { serviceId, barberId, date, startTime } = input;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      duration: true,
      active: true,
      barbers: { select: { barberId: true } },
    },
  });

  if (!isServiceAvailableForBarber(service, barberId)) {
    throw new Error("SLOT_UNAVAILABLE");
  }

  if (await isClientBanned({ profileId: clientId })) {
    throw new Error("CLIENT_BANNED");
  }

  const endTime = calculateEndTime(startTime, service.duration);

  const appointmentDateLocal = parseDateString(date);
  const appointmentDateDb = parseDateStringToUTC(date);

  if (isDateTimeInPast(appointmentDateLocal, startTime)) {
    throw new Error("SLOT_IN_PAST");
  }

  if (isSlotTooSoonForClient(getMinutesUntilAppointment(date, startTime))) {
    throw new Error("SLOT_TOO_SOON");
  }

  const policyError = await getBookingPolicyError({
    barberId,
    appointmentDateLocal,
    appointmentDateDb,
    startTime,
    serviceDuration: service.duration,
  });

  if (policyError) {
    throw new Error(policyError);
  }

  // Prevent concurrent overlaps:
  // serialize overlap-check + create via an advisory lock (barber+date) in a transaction.
  const appointment = await prisma.$transaction(async (tx) => {
    await lockBarberDateForBooking(tx, barberId, appointmentDateDb);

    const hasOverlap = await hasOverlappingAppointment(
      tx,
      barberId,
      appointmentDateDb,
      startTime,
      endTime,
    );

    if (hasOverlap) {
      throw new Error("SLOT_OCCUPIED");
    }

    return tx.appointment.create({
      data: {
        clientId,
        barberId,
        serviceId,
        date: appointmentDateDb,
        startTime,
        endTime,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        guestClient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        barber: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
      },
    });
  });

  return {
    id: appointment.id,
    clientId: appointment.clientId,
    guestClientId: appointment.guestClientId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    date: formatPrismaDateToString(appointment.date),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    cancelReason: appointment.cancelReason,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    client: appointment.client,
    guestClient: appointment.guestClient,
    barber: appointment.barber,
    service: {
      ...appointment.service,
      price: Number(appointment.service.price),
    },
  };
}

/**
 * Result of creating a guest appointment, includes the access token for localStorage
 */
export interface GuestAppointmentResult {
  appointment: AppointmentWithDetails;
  accessToken: string;
}

/**
 * Create a new appointment for a guest (no login required)
 * Returns the appointment and an access token for device-bound session
 */
export async function createGuestAppointment(
  input: CreateGuestAppointmentInput,
): Promise<GuestAppointmentResult> {
  const { serviceId, barberId, date, startTime, clientName, clientPhone } =
    input;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      duration: true,
      active: true,
      barbers: { select: { barberId: true } },
    },
  });

  if (!isServiceAvailableForBarber(service, barberId)) {
    throw new Error("SLOT_UNAVAILABLE");
  }

  const normalizedPhone = normalizePhoneDigits(clientPhone);
  const existingGuest = await prisma.guestClient.findUnique({
    where: { phone: normalizedPhone },
    select: { id: true },
  });
  if (
    existingGuest &&
    (await isClientBanned({ guestClientId: existingGuest.id }))
  ) {
    throw new Error("CLIENT_BANNED");
  }

  if (await isPhoneLinkedToBannedProfile(normalizedPhone)) {
    throw new Error("CLIENT_BANNED");
  }

  const endTime = calculateEndTime(startTime, service.duration);

  const appointmentDateLocal = parseDateString(date);
  const appointmentDateDb = parseDateStringToUTC(date);

  if (isDateTimeInPast(appointmentDateLocal, startTime)) {
    throw new Error("SLOT_IN_PAST");
  }

  if (isSlotTooSoonForClient(getMinutesUntilAppointment(date, startTime))) {
    throw new Error("SLOT_TOO_SOON");
  }

  const policyError = await getBookingPolicyError({
    barberId,
    appointmentDateLocal,
    appointmentDateDb,
    startTime,
    serviceDuration: service.duration,
  });

  if (policyError) {
    throw new Error(policyError);
  }

  const result = await prisma.$transaction(async (tx) => {
    await lockBarberDateForBooking(tx, barberId, appointmentDateDb);

    const hasOverlap = await hasOverlappingAppointment(
      tx,
      barberId,
      appointmentDateDb,
      startTime,
      endTime,
    );

    if (hasOverlap) {
      throw new Error("SLOT_OCCUPIED");
    }

    // Generate a new access token for the guest client
    const accessToken = crypto.randomUUID();

    const guestClient = await tx.guestClient.upsert({
      where: { phone: normalizedPhone },
      update: {
        fullName: clientName,
        // Update access token on each booking to link this device
        accessToken,
        accessTokenConsumedAt: null,
      },
      create: {
        fullName: clientName,
        phone: normalizedPhone,
        accessToken,
        accessTokenConsumedAt: null,
      },
    });

    const appointment = await tx.appointment.create({
      data: {
        guestClientId: guestClient.id,
        barberId,
        serviceId,
        date: appointmentDateDb,
        startTime,
        endTime,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        guestClient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        barber: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
      },
    });

    return { appointment, accessToken };
  });

  return {
    appointment: {
      id: result.appointment.id,
      clientId: result.appointment.clientId,
      guestClientId: result.appointment.guestClientId,
      barberId: result.appointment.barberId,
      serviceId: result.appointment.serviceId,
      date: formatPrismaDateToString(result.appointment.date),
      startTime: result.appointment.startTime,
      endTime: result.appointment.endTime,
      status: result.appointment.status,
      cancelReason: result.appointment.cancelReason,
      createdAt: result.appointment.createdAt.toISOString(),
      updatedAt: result.appointment.updatedAt.toISOString(),
      client: result.appointment.client,
      guestClient: result.appointment.guestClient,
      barber: result.appointment.barber,
      service: {
        ...result.appointment.service,
        price: Number(result.appointment.service.price),
      },
    },
    accessToken: result.accessToken,
  };
}

/**
 * Create a new appointment by a barber for a client
 * Used when the barber creates the booking on behalf of the client
 * Does not generate an access token (client can still look up by phone if needed)
 */
export async function createAppointmentByBarber(
  input: CreateAppointmentByBarberInput,
  barberId: string,
): Promise<AppointmentWithDetails> {
  const { serviceId, date, startTime, clientName, clientPhone } = input;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      duration: true,
      active: true,
      barbers: { select: { barberId: true } },
    },
  });

  if (!isServiceAvailableForBarber(service, barberId)) {
    throw new Error("SLOT_UNAVAILABLE");
  }

  const normalizedPhone = normalizePhoneDigits(clientPhone);
  const existingGuest = await prisma.guestClient.findUnique({
    where: { phone: normalizedPhone },
    select: { id: true },
  });
  if (
    existingGuest &&
    (await isClientBanned({ guestClientId: existingGuest.id }))
  ) {
    throw new Error("CLIENT_BANNED");
  }

  if (await isPhoneLinkedToBannedProfile(normalizedPhone)) {
    throw new Error("CLIENT_BANNED");
  }

  const endTime = calculateEndTime(startTime, service.duration);

  const appointmentDateLocal = parseDateString(date);
  const appointmentDateDb = parseDateStringToUTC(date);

  if (isDateTimeInPast(appointmentDateLocal, startTime)) {
    throw new Error("SLOT_IN_PAST");
  }

  const policyError = await getBookingPolicyError({
    barberId,
    appointmentDateLocal,
    appointmentDateDb,
    startTime,
    serviceDuration: service.duration,
  });

  if (policyError) {
    throw new Error(policyError);
  }
  const appointment = await prisma.$transaction(async (tx) => {
    await lockBarberDateForBooking(tx, barberId, appointmentDateDb);

    const hasOverlap = await hasOverlappingAppointment(
      tx,
      barberId,
      appointmentDateDb,
      startTime,
      endTime,
    );

    if (hasOverlap) {
      throw new Error("SLOT_OCCUPIED");
    }

    // Create or update guest client (without generating new access token)
    const guestClient = await tx.guestClient.upsert({
      where: { phone: normalizedPhone },
      update: {
        fullName: clientName,
        // Don't update accessToken - preserve existing token if present
      },
      create: {
        fullName: clientName,
        phone: normalizedPhone,
        // No accessToken for barber-created bookings
      },
    });

    return tx.appointment.create({
      data: {
        guestClientId: guestClient.id,
        barberId,
        serviceId,
        date: appointmentDateDb,
        startTime,
        endTime,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        guestClient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        barber: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
      },
    });
  });

  return {
    id: appointment.id,
    clientId: appointment.clientId,
    guestClientId: appointment.guestClientId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    date: formatPrismaDateToString(appointment.date),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    cancelReason: appointment.cancelReason,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    client: appointment.client,
    guestClient: appointment.guestClient,
    barber: appointment.barber,
    service: {
      ...appointment.service,
      price: Number(appointment.service.price),
    },
  };
}

/**
 * Get all future appointments for a client
 */
export async function getClientAppointments(
  clientId: string,
): Promise<AppointmentWithDetails[]> {
  // Use UTC midnight for today in Brazil timezone to correctly compare
  // against Prisma @db.Date fields which store dates at UTC 00:00:00
  const today = getTodayUTCMidnight();

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId,
      date: {
        gte: today,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return appointments.map((apt) => ({
    id: apt.id,
    clientId: apt.clientId,
    guestClientId: apt.guestClientId,
    barberId: apt.barberId,
    serviceId: apt.serviceId,
    date: formatPrismaDateToString(apt.date),
    startTime: apt.startTime,
    endTime: apt.endTime,
    status: apt.status,
    cancelReason: apt.cancelReason,
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
    client: apt.client,
    guestClient: apt.guestClient,
    barber: apt.barber,
    service: {
      ...apt.service,
      price: Number(apt.service.price),
    },
  }));
}

/**
 * Get appointments for a barber within a date range
 */
export async function getBarberAppointments(
  barberId: string,
  dateRange: DateRange,
): Promise<AppointmentWithDetails[]> {
  // Calculate the day after endDate to use with `lt` instead of `lte`
  // This ensures all appointments on the end date are included regardless of timezone
  const endDatePlusOne = new Date(dateRange.end);
  endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      date: {
        gte: dateRange.start,
        lt: endDatePlusOne,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const mappedAppointments = appointments.map((apt) => ({
    id: apt.id,
    clientId: apt.clientId,
    guestClientId: apt.guestClientId,
    barberId: apt.barberId,
    serviceId: apt.serviceId,
    date: formatPrismaDateToString(apt.date),
    startTime: apt.startTime,
    endTime: apt.endTime,
    status: apt.status,
    cancelReason: apt.cancelReason,
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
    client: apt.client,
    guestClient: apt.guestClient,
    barber: apt.barber,
    service: {
      ...apt.service,
      price: Number(apt.service.price),
    },
  }));

  return consolidateOperationalAppointments(mappedAppointments);
}

// ============================================
// Cancellation Functions
// ============================================

/**
 * Get minutes until an appointment from Prisma date format.
 * Returns negative value if appointment is in the past.
 */
export function getMinutesUntilAppointmentFromPrisma(
  appointmentDate: Date,
  appointmentTime: string,
): number {
  const appointmentDateStr = formatPrismaDateToString(appointmentDate);
  const brazilDateStr = getBrazilDateString();

  // If appointment date is in the past, return a large negative number
  if (appointmentDateStr < brazilDateStr) {
    return -9999;
  }

  return getMinutesUntilAppointment(appointmentDateStr, appointmentTime);
}

/**
 * Checks if an appointment can be cancelled by a client.
 *
 * Business rule (updated 2024-12):
 * - Cancellation is BLOCKED when within 2 hours of the appointment.
 * - Client must cancel at least 2 hours before to avoid no-show fee.
 *
 * Note: appointmentDate comes from Prisma @db.Date field as UTC midnight.
 * We extract year/month/day using UTC methods and compare against Brazil timezone.
 *
 * The comparison uses formatPrismaDateToString to get the appointment's date string
 * and compares it with getBrazilDateString (current Brazil date) for consistency.
 */
export function canClientCancel(
  appointmentDate: Date,
  appointmentTime: string,
): boolean {
  const minutesUntilAppointment = getMinutesUntilAppointmentFromPrisma(
    appointmentDate,
    appointmentTime,
  );

  // Client can only cancel if MORE than 2 hours before the appointment
  return canClientCancelOutsideWindow(minutesUntilAppointment);
}

/**
 * Determine if cancellation is blocked (within 2h window but not past).
 * Used to show appropriate messaging to clients.
 */
export function isClientCancellationBlocked(
  appointmentDate: Date,
  appointmentTime: string,
): boolean {
  const minutesUntilAppointment = getMinutesUntilAppointmentFromPrisma(
    appointmentDate,
    appointmentTime,
  );

  // Blocked if within the 2h window but not already past
  return (
    minutesUntilAppointment > 0 &&
    minutesUntilAppointment <= CANCELLATION_BLOCK_WINDOW_MINUTES
  );
}

/**
 * @deprecated Cancellation is now blocked, not just warned. Use isClientCancellationBlocked instead.
 */
export function shouldWarnLateCancellation(
  appointmentDate: Date,
  appointmentTime: string,
): boolean {
  const appointmentDateStr = formatPrismaDateToString(appointmentDate);
  const minutesUntilAppointment = getMinutesUntilAppointment(
    appointmentDateStr,
    appointmentTime,
  );

  return shouldWarnLateCancellationCore(
    minutesUntilAppointment,
    CANCELLATION_BLOCK_WINDOW_MINUTES,
  );
}

/**
 * Cancel an appointment by client
 * Cancellation is BLOCKED when within 2 hours of the appointment.
 */
export async function cancelAppointmentByClient(
  appointmentId: string,
  clientId: string,
): Promise<AppointmentWithDetails> {
  // Get the appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  if (appointment.clientId !== clientId) {
    throw new Error("UNAUTHORIZED");
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new Error("APPOINTMENT_NOT_CANCELLABLE");
  }

  // Check if cancellation is blocked (within 2h window)
  if (isClientCancellationBlocked(appointment.date, appointment.startTime)) {
    throw new Error("CANCELLATION_BLOCKED");
  }

  // Check if appointment is in the past
  if (!canClientCancel(appointment.date, appointment.startTime)) {
    throw new Error("APPOINTMENT_IN_PAST");
  }

  // Update the appointment
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED_BY_CLIENT,
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    clientId: updated.clientId,
    guestClientId: updated.guestClientId,
    barberId: updated.barberId,
    serviceId: updated.serviceId,
    date: formatPrismaDateToString(updated.date),
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status,
    cancelReason: updated.cancelReason,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    client: updated.client,
    guestClient: updated.guestClient,
    barber: updated.barber,
    service: {
      ...updated.service,
      price: Number(updated.service.price),
    },
  };
}

/**
 * Cancel an appointment by barber
 * Requires a cancellation reason
 */
export async function cancelAppointmentByBarber(
  appointmentId: string,
  barberId: string,
  reason: string,
): Promise<AppointmentWithDetails> {
  // Validate reason is provided
  if (!reason || reason.trim().length === 0) {
    throw new Error("CANCELLATION_REASON_REQUIRED");
  }

  // Get the appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  if (appointment.barberId !== barberId) {
    throw new Error("UNAUTHORIZED");
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new Error("APPOINTMENT_NOT_CANCELLABLE");
  }

  // Barber can cancel until the appointment starts.
  const minutesUntilAppointment = getMinutesUntilAppointmentFromPrisma(
    appointment.date,
    appointment.startTime,
  );
  if (!canCancelBeforeStart(minutesUntilAppointment)) {
    throw new Error("APPOINTMENT_IN_PAST");
  }

  // Update the appointment
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED_BY_BARBER,
      cancelReason: reason.trim(),
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    clientId: updated.clientId,
    guestClientId: updated.guestClientId,
    barberId: updated.barberId,
    serviceId: updated.serviceId,
    date: formatPrismaDateToString(updated.date),
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status,
    cancelReason: updated.cancelReason,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    client: updated.client,
    guestClient: updated.guestClient,
    barber: updated.barber,
    service: {
      ...updated.service,
      price: Number(updated.service.price),
    },
  };
}

/**
 * Mark an appointment as NO_SHOW by barber
 * Can only be done after the appointment start time has passed
 */
export async function markAppointmentAsNoShow(
  appointmentId: string,
  barberId: string,
): Promise<AppointmentWithDetails> {
  // Get the appointment with ownership check in query to avoid leaking existence info
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      barberId: barberId,
    },
  });

  if (!appointment) {
    // Returns generic NOT_FOUND whether the appointment doesn't exist
    // or belongs to another barber (security: no information leakage)
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new Error("APPOINTMENT_NOT_MARKABLE");
  }

  // Check if the appointment time has passed (can only mark NO_SHOW after start time)
  const minutesUntil = getMinutesUntilAppointmentFromPrisma(
    appointment.date,
    appointment.startTime,
  );

  if (minutesUntil > 0) {
    throw new Error("APPOINTMENT_NOT_STARTED");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.NO_SHOW,
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
  });

  if (updated.clientId && updated.client) {
    try {
      const { LoyaltyService } = await import("./loyalty/loyalty.service");
      const { calculateAppointmentPoints } = await import(
        "./loyalty/points.calculator"
      );

      const account = await LoyaltyService.getOrCreateAccount(updated.clientId);
      const pointsData = calculateAppointmentPoints(
        Number(updated.service.price),
        account.tier,
      );

      await LoyaltyService.penalizePoints({
        accountId: account.id,
        points: pointsData.total,
        description: `Não compareceu: ${updated.service.name}`,
        referenceId: updated.id,
      });
    } catch (error) {
      console.error("Falha ao aplicar penalidade de pontos", error);
    }
  }

  return {
    id: updated.id,
    clientId: updated.clientId,
    guestClientId: updated.guestClientId,
    barberId: updated.barberId,
    serviceId: updated.serviceId,
    date: formatPrismaDateToString(updated.date),
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status,
    cancelReason: updated.cancelReason,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    client: updated.client,
    guestClient: updated.guestClient,
    barber: updated.barber,
    service: {
      ...updated.service,
      price: Number(updated.service.price),
    },
  };
}

/**
 * Mark an appointment as COMPLETED by barber
 * Automatically triggers the Loyalty System to reward points
 */
export async function markAppointmentAsCompleted(
  appointmentId: string,
  barberId: string,
): Promise<AppointmentWithDetails> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      barberId: barberId,
    },
    include: {
      service: true,
      client: true,
    },
  });

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new Error("APPOINTMENT_NOT_MARKABLE");
  }

  const minutesUntil = getMinutesUntilAppointmentFromPrisma(
    appointment.date,
    appointment.startTime,
  );

  if (minutesUntil > 0) {
    throw new Error("APPOINTMENT_NOT_STARTED");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.COMPLETED,
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
  });

  // Integrar pontuação do sistema de fidelidade para clientes cadastrados
  if (updated.clientId && updated.client) {
    try {
      // Import dinâmico para evitar circular dependency
      const { LoyaltyService } = await import("./loyalty/loyalty.service");
      const { calculateAppointmentPoints } = await import(
        "./loyalty/points.calculator"
      );

      const account = await LoyaltyService.getOrCreateAccount(updated.clientId);
      const pointsData = calculateAppointmentPoints(
        Number(updated.service.price),
        account.tier,
      );

      const pointsDescription = `Agendamento concluído: ${updated.service.name}`;

      await LoyaltyService.creditPoints({
        accountId: account.id,
        type: "EARNED_APPOINTMENT",
        points: pointsData.total,
        description: pointsDescription,
        referenceId: updated.id,
      });

      const { LoyaltyNotificationService } = await import(
        "./loyalty/notification.service"
      );
      await LoyaltyNotificationService.notifyPointsEarned(
        updated.clientId,
        pointsData.total,
        pointsDescription,
      );

      if (account.referredById) {
        const completedCount = await prisma.appointment.count({
          where: {
            clientId: updated.clientId,
            status: AppointmentStatus.COMPLETED,
          },
        });

        if (completedCount === 1) {
          const { ReferralService } = await import(
            "./loyalty/referral.service"
          );
          await ReferralService.creditReferralBonus(account.id);
        }
      }
    } catch (error) {
      console.error("Falha ao registrar pontos de fidelidade", error);
    }
  }

  return {
    id: updated.id,
    clientId: updated.clientId,
    guestClientId: updated.guestClientId,
    barberId: updated.barberId,
    serviceId: updated.serviceId,
    date: formatPrismaDateToString(updated.date),
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status,
    cancelReason: updated.cancelReason,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    client: updated.client,
    guestClient: updated.guestClient,
    barber: updated.barber,
    service: {
      ...updated.service,
      price: Number(updated.service.price),
    },
  };
}

// ============================================
// Guest Appointment Functions
// ============================================

async function getGuestClientByActiveToken(accessToken: string): Promise<{
  id: string;
}> {
  const guestClient = await prisma.guestClient.findUnique({
    where: { accessToken },
    select: {
      id: true,
      accessTokenConsumedAt: true,
    },
  });

  if (!guestClient) {
    throw new Error("GUEST_NOT_FOUND");
  }

  if (guestClient.accessTokenConsumedAt) {
    throw new Error("GUEST_TOKEN_CONSUMED");
  }

  return { id: guestClient.id };
}

/**
 * Get all future appointments for a guest client by access token (secure)
 */
export async function getGuestAppointmentsByToken(
  accessToken: string,
): Promise<AppointmentWithDetails[]> {
  let guestClient: { id: string };
  try {
    guestClient = await getGuestClientByActiveToken(accessToken);
  } catch (error) {
    if (error instanceof Error && error.message === "GUEST_NOT_FOUND") {
      return [];
    }
    throw error;
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      guestClientId: guestClient.id,
      date: {
        gte: getTodayUTCMidnight(),
      },
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return appointments.map((apt) => ({
    id: apt.id,
    clientId: apt.clientId,
    guestClientId: apt.guestClientId,
    barberId: apt.barberId,
    serviceId: apt.serviceId,
    date: formatPrismaDateToString(apt.date),
    startTime: apt.startTime,
    endTime: apt.endTime,
    status: apt.status,
    cancelReason: apt.cancelReason,
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
    client: apt.client,
    guestClient: apt.guestClient,
    barber: apt.barber,
    service: {
      ...apt.service,
      price: Number(apt.service.price),
    },
  }));
}

/**
 * @deprecated Use getGuestAppointmentsByToken instead for secure access
 * Get all future appointments for a guest client by phone number
 */
export async function getGuestAppointments(
  phone: string,
): Promise<AppointmentWithDetails[]> {
  const normalizedPhone = normalizePhoneDigits(phone);

  // Find guest client by phone
  const guestClient = await prisma.guestClient.findUnique({
    where: { phone: normalizedPhone },
  });

  if (!guestClient) {
    return []; // No guest client found with this token
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      guestClientId: guestClient.id,
      date: {
        gte: getTodayUTCMidnight(),
      },
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return appointments.map((apt) => ({
    id: apt.id,
    clientId: apt.clientId,
    guestClientId: apt.guestClientId,
    barberId: apt.barberId,
    serviceId: apt.serviceId,
    date: formatPrismaDateToString(apt.date),
    startTime: apt.startTime,
    endTime: apt.endTime,
    status: apt.status,
    cancelReason: apt.cancelReason,
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
    client: apt.client,
    guestClient: apt.guestClient,
    barber: apt.barber,
    service: {
      ...apt.service,
      price: Number(apt.service.price),
    },
  }));
}

/**
 * Cancel an appointment by guest client using access token (secure)
 * Validates ownership via access token and respects cancellation window
 * Cancellation is BLOCKED when within 2 hours of the appointment.
 */
export async function cancelAppointmentByGuestToken(
  appointmentId: string,
  accessToken: string,
): Promise<AppointmentWithDetails> {
  const guestClient = await getGuestClientByActiveToken(accessToken);

  // Get the appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  if (appointment.guestClientId !== guestClient.id) {
    throw new Error("UNAUTHORIZED");
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new Error("APPOINTMENT_NOT_CANCELLABLE");
  }

  // Check if cancellation is blocked (within 2h window)
  if (isClientCancellationBlocked(appointment.date, appointment.startTime)) {
    throw new Error("CANCELLATION_BLOCKED");
  }

  // Check if appointment is in the past
  if (!canClientCancel(appointment.date, appointment.startTime)) {
    throw new Error("APPOINTMENT_IN_PAST");
  }

  // Update the appointment
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED_BY_CLIENT,
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    clientId: updated.clientId,
    guestClientId: updated.guestClientId,
    barberId: updated.barberId,
    serviceId: updated.serviceId,
    date: formatPrismaDateToString(updated.date),
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status,
    cancelReason: updated.cancelReason,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    client: updated.client,
    guestClient: updated.guestClient,
    barber: updated.barber,
    service: {
      ...updated.service,
      price: Number(updated.service.price),
    },
  };
}

/**
 * @deprecated Use cancelAppointmentByGuestToken instead for secure access
 * Cancel an appointment by guest client
 * Validates ownership via phone number and respects cancellation window
 */
export async function cancelAppointmentByGuest(
  appointmentId: string,
  phone: string,
): Promise<AppointmentWithDetails> {
  const normalizedPhone = normalizePhoneDigits(phone);

  // Find guest client by phone
  const guestClient = await prisma.guestClient.findUnique({
    where: { phone: normalizedPhone },
  });

  if (!guestClient) {
    throw new Error("GUEST_NOT_FOUND");
  }

  // Get the appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  if (appointment.guestClientId !== guestClient.id) {
    throw new Error("UNAUTHORIZED");
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw new Error("APPOINTMENT_NOT_CANCELLABLE");
  }

  // Check if cancellation is blocked (within 2h window)
  if (isClientCancellationBlocked(appointment.date, appointment.startTime)) {
    throw new Error("CANCELLATION_BLOCKED");
  }

  // Check if appointment is in the past
  if (!canClientCancel(appointment.date, appointment.startTime)) {
    throw new Error("APPOINTMENT_IN_PAST");
  }

  // Update the appointment
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED_BY_CLIENT,
    },
    include: {
      client: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      guestClient: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    clientId: updated.clientId,
    guestClientId: updated.guestClientId,
    barberId: updated.barberId,
    serviceId: updated.serviceId,
    date: formatPrismaDateToString(updated.date),
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: updated.status,
    cancelReason: updated.cancelReason,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    client: updated.client,
    guestClient: updated.guestClient,
    barber: updated.barber,
    service: {
      ...updated.service,
      price: Number(updated.service.price),
    },
  };
}

export const getPublicServicesWithCache = unstable_cache(
  () => getServices(),
  ["public-services"],
  { revalidate: 300 },
);

export async function getActiveBarbers(): Promise<
  import("@/types/booking").BarberData[]
> {
  const barbers = await prisma.barber.findMany({
    where: { active: true },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
  return barbers;
}

export const getPublicBarbersWithCache = unstable_cache(
  () => getActiveBarbers(),
  ["public-barbers"],
  { revalidate: 300 },
);
