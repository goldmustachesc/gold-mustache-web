import { prisma } from "@/lib/prisma";
import {
  canCancelBeforeStart,
  CANCELLATION_WARNING_WINDOW_MINUTES,
  shouldWarnLateCancellation as shouldWarnLateCancellationCore,
} from "@/lib/booking/cancellation";
import { normalizePhoneDigits } from "@/lib/booking/phone";
import { calculateEndTime } from "@/lib/booking/time";
import { getWorkingHoursSlotError } from "@/lib/booking/slots-policy";
import {
  getAbsenceSlotError,
  getShopSlotError,
} from "@/lib/booking/availability-policy";
import {
  generateTimeSlots,
  filterAvailableSlots,
  filterPastSlots,
  parseDateString,
  parseDateStringToUTC,
  parseTimeToMinutes,
  formatDateToString,
  formatPrismaDateToString,
  isDateTimeInPast,
  getBrazilDateString,
  getTodayUTCMidnight,
  getMinutesUntilAppointment,
} from "@/utils/time-slots";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import type {
  ServiceData,
  TimeSlot,
  CreateAppointmentInput,
  CreateGuestAppointmentInput,
  CreateAppointmentByBarberInput,
  AppointmentWithDetails,
  DateRange,
} from "@/types/booking";
import { AppointmentStatus, type Prisma } from "@prisma/client";

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

  // Shop-wide hours gate (checked first for fallback)
  const shopHours = await prisma.shopHours.findUnique({
    where: { dayOfWeek },
  });

  if (
    !shopHours ||
    !shopHours.isOpen ||
    !shopHours.startTime ||
    !shopHours.endTime
  ) {
    return "SHOP_CLOSED";
  }

  // Barber working hours - fallback to shop hours if not configured
  const workingHours = await prisma.workingHours.findUnique({
    where: {
      barberId_dayOfWeek: {
        barberId,
        dayOfWeek,
      },
    },
  });

  // Use barber's working hours if available, otherwise use shop hours as fallback
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

  // Pure policy: validate slot is within working hours and aligned to slot grid (incl. break)
  const workingHoursError = getWorkingHoursSlotError({
    workingStartTime: effectiveHours.startTime,
    workingEndTime: effectiveHours.endTime,
    breakStart: effectiveHours.breakStart,
    breakEnd: effectiveHours.breakEnd,
    startTime,
    durationMinutes: serviceDuration,
  });
  if (workingHoursError) return workingHoursError;

  // Shop closures (date-specific)
  const shopClosures = await prisma.shopClosure.findMany({
    where: { date: appointmentDateDb },
    select: { startTime: true, endTime: true },
  });

  // Barber absences (date-specific)
  const absences = await prisma.barberAbsence.findMany({
    where: { barberId, date: appointmentDateDb },
    select: { startTime: true, endTime: true },
  });

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
export async function getAvailableSlots(
  date: Date,
  barberId: string,
  serviceId: string,
): Promise<TimeSlot[]> {
  const dateStr = formatDateToString(date);
  const businessDate = parseIsoDateYyyyMmDdAsSaoPauloDate(dateStr);
  const dayOfWeek = businessDate.getUTCDay();
  const dateForDb = parseDateStringToUTC(dateStr);

  // Get service duration
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { duration: true },
  });

  if (!service) {
    return []; // Service not found
  }

  // Shop-wide hours gate
  const shopHours = await prisma.shopHours.findUnique({
    where: { dayOfWeek },
  });

  if (
    !shopHours ||
    !shopHours.isOpen ||
    !shopHours.startTime ||
    !shopHours.endTime
  ) {
    return []; // Shop closed on this day
  }

  // Shop closures (date-specific)
  const shopClosures = await prisma.shopClosure.findMany({
    where: { date: dateForDb },
    select: { startTime: true, endTime: true },
  });

  if (shopClosures.some((c) => !c.startTime || !c.endTime)) {
    return []; // Shop closed all day
  }

  // Barber absences (date-specific)
  const absences = await prisma.barberAbsence.findMany({
    where: { barberId, date: dateForDb },
    select: { startTime: true, endTime: true },
  });

  if (absences.some((a) => !a.startTime || !a.endTime)) {
    return []; // Barber absent all day
  }

  // Get barber's working hours for this day
  const workingHours = await prisma.workingHours.findUnique({
    where: {
      barberId_dayOfWeek: {
        barberId,
        dayOfWeek,
      },
    },
  });

  // Use barber's working hours if available, otherwise use shop hours as fallback
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

  // Get existing appointments for this date and barber
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      barberId,
      date: dateForDb,
      status: AppointmentStatus.CONFIRMED,
    },
    select: {
      startTime: true,
      endTime: true,
      status: true,
    },
  });

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

  // Get service to calculate end time
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const endTime = calculateEndTime(startTime, service.duration);

  // Parse date for local (business logic) and UTC (DB) usage
  const appointmentDateLocal = parseDateString(date);
  const appointmentDateDb = parseDateStringToUTC(date);

  // Validate that the appointment is not in the past
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

  // Get service to calculate end time
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const endTime = calculateEndTime(startTime, service.duration);

  // Parse date for local (business logic) and UTC (DB) usage
  const appointmentDateLocal = parseDateString(date);
  const appointmentDateDb = parseDateStringToUTC(date);

  // Validate that the appointment is not in the past
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

  const normalizedPhone = normalizePhoneDigits(clientPhone);

  // Same concurrency protection for guest bookings.
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
      },
      create: {
        fullName: clientName,
        phone: normalizedPhone,
        accessToken,
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

  // Get service to calculate end time
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const endTime = calculateEndTime(startTime, service.duration);

  // Parse date for local (business logic) and UTC (DB) usage
  const appointmentDateLocal = parseDateString(date);
  const appointmentDateDb = parseDateStringToUTC(date);

  // Validate that the appointment is not in the past
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

  const normalizedPhone = normalizePhoneDigits(clientPhone);

  // Same concurrency protection for barber bookings
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
        // Don't update accessToken - preserve existing if any
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

// ============================================
// Cancellation Functions
// ============================================

/**
 * Checks if an appointment can be cancelled by a client.
 *
 * Business rule (updated):
 * - Cancellation is allowed up to the appointment start time.
 * - If cancelling with less than 2 hours of notice, it should be treated as a warning (UI),
 *   not a hard block (backend).
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
  // Get appointment date as "YYYY-MM-DD" string (using UTC since Prisma stores dates at UTC midnight)
  const appointmentDateStr = formatPrismaDateToString(appointmentDate);

  // Get current Brazil date as "YYYY-MM-DD" string
  const brazilDateStr = getBrazilDateString();

  // Check if appointment is in the past
  if (appointmentDateStr < brazilDateStr) {
    return false;
  }

  // Calculate actual minutes until the appointment (handles cross-day scenarios)
  // e.g., 23:30 today to 00:30 tomorrow = 60 minutes, not "future day = always ok"
  const minutesUntilAppointment = getMinutesUntilAppointment(
    appointmentDateStr,
    appointmentTime,
  );

  return canCancelBeforeStart(minutesUntilAppointment);
}

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
    CANCELLATION_WARNING_WINDOW_MINUTES,
  );
}

/**
 * Cancel an appointment by client
 * Cancellation is allowed until the appointment start time.
 * If within 2 hours, it's allowed (warning should be handled by UI).
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

  // Check cancellation is still possible (not in the past / already started)
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

  // Align with client/guest rule: cancellation is allowed only before the start time.
  // This prevents cancelling already-started (or past) appointments that are still marked as CONFIRMED.
  if (!canClientCancel(appointment.date, appointment.startTime)) {
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

// ============================================
// Guest Appointment Functions
// ============================================

/**
 * Get all future appointments for a guest client by access token (secure)
 */
export async function getGuestAppointmentsByToken(
  accessToken: string,
): Promise<AppointmentWithDetails[]> {
  // Find guest client by access token
  const guestClient = await prisma.guestClient.findUnique({
    where: { accessToken },
  });

  if (!guestClient) {
    return []; // No guest client found with this token
  }

  // Use UTC midnight for today in Brazil timezone to correctly compare
  // against Prisma @db.Date fields which store dates at UTC 00:00:00
  const today = getTodayUTCMidnight();

  const appointments = await prisma.appointment.findMany({
    where: {
      guestClientId: guestClient.id,
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
    return []; // No guest client found with this phone
  }

  // Use UTC midnight for today in Brazil timezone to correctly compare
  // against Prisma @db.Date fields which store dates at UTC 00:00:00
  const today = getTodayUTCMidnight();

  const appointments = await prisma.appointment.findMany({
    where: {
      guestClientId: guestClient.id,
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
 * Cancel an appointment by guest client using access token (secure)
 * Validates ownership via access token and respects cancellation window
 */
export async function cancelAppointmentByGuestToken(
  appointmentId: string,
  accessToken: string,
): Promise<AppointmentWithDetails> {
  // Find guest client by access token
  const guestClient = await prisma.guestClient.findUnique({
    where: { accessToken },
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

  // Check cancellation is still possible (not in the past / already started)
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

  // Check cancellation is still possible (not in the past / already started)
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
