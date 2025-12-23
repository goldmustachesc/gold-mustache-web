import { prisma } from "@/lib/prisma";
import {
  generateTimeSlots,
  filterAvailableSlots,
  parseDateString,
  formatDateToString,
} from "@/utils/time-slots";
import type {
  ServiceData,
  TimeSlot,
  CreateAppointmentInput,
  CreateGuestAppointmentInput,
  AppointmentWithDetails,
  DateRange,
} from "@/types/booking";
import { AppointmentStatus } from "@prisma/client";

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
 */
export async function getAvailableSlots(
  date: Date,
  barberId: string,
  serviceId: string,
): Promise<TimeSlot[]> {
  const dayOfWeek = date.getDay();

  // Get service duration
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { duration: true },
  });

  if (!service) {
    return []; // Service not found
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

  if (!workingHours) {
    return []; // Barber doesn't work on this day
  }

  // Get existing appointments for this date and barber
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      barberId,
      date,
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
    startTime: workingHours.startTime,
    endTime: workingHours.endTime,
    duration: service.duration,
    breakStart: workingHours.breakStart,
    breakEnd: workingHours.breakEnd,
  });

  // Filter out slots that would conflict with existing appointments
  const availableSlots = filterAvailableSlots(
    allSlots,
    existingAppointments.map((apt) => ({
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
    })),
    service.duration,
  );

  return availableSlots.map((slot) => ({
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

  // Calculate end time based on service duration
  const [hours, minutes] = startTime.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + service.duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

  // Parse date string to local timezone to avoid UTC interpretation issues
  const appointmentDate = parseDateString(date);

  // Check if slot is available
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      barberId,
      date: appointmentDate,
      startTime,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  if (existingAppointment) {
    throw new Error("SLOT_OCCUPIED");
  }

  // Create the appointment
  const appointment = await prisma.appointment.create({
    data: {
      clientId,
      barberId,
      serviceId,
      date: appointmentDate,
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

  return {
    id: appointment.id,
    clientId: appointment.clientId,
    guestClientId: appointment.guestClientId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    date: formatDateToString(appointment.date),
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
 * Create a new appointment for a guest (no login required)
 */
export async function createGuestAppointment(
  input: CreateGuestAppointmentInput,
): Promise<AppointmentWithDetails> {
  const { serviceId, barberId, date, startTime, clientName, clientPhone } =
    input;

  // Get service to calculate end time
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  // Calculate end time based on service duration
  const [hours, minutes] = startTime.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + service.duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

  // Parse date string to local timezone to avoid UTC interpretation issues
  const appointmentDate = parseDateString(date);

  // Check if slot is available
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      barberId,
      date: appointmentDate,
      startTime,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  if (existingAppointment) {
    throw new Error("SLOT_OCCUPIED");
  }

  // Find or create guest client by phone
  const normalizedPhone = clientPhone.replace(/\D/g, "");
  let guestClient = await prisma.guestClient.findUnique({
    where: { phone: normalizedPhone },
  });

  if (!guestClient) {
    guestClient = await prisma.guestClient.create({
      data: {
        fullName: clientName,
        phone: normalizedPhone,
      },
    });
  } else {
    // Update name if different (client may have provided different name)
    if (guestClient.fullName !== clientName) {
      guestClient = await prisma.guestClient.update({
        where: { id: guestClient.id },
        data: { fullName: clientName },
      });
    }
  }

  // Create the appointment
  const appointment = await prisma.appointment.create({
    data: {
      guestClientId: guestClient.id,
      barberId,
      serviceId,
      date: appointmentDate,
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

  return {
    id: appointment.id,
    clientId: appointment.clientId,
    guestClientId: appointment.guestClientId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    date: formatDateToString(appointment.date),
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    date: formatDateToString(apt.date),
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
    date: formatDateToString(apt.date),
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

const CANCELLATION_WINDOW_HOURS = 2;

/**
 * Checks if an appointment can be cancelled by client (at least 2 hours before)
 */
export function canClientCancel(
  appointmentDate: Date,
  appointmentTime: string,
): boolean {
  const [hours, minutes] = appointmentTime.split(":").map(Number);
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const hoursUntilAppointment =
    (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilAppointment >= CANCELLATION_WINDOW_HOURS;
}

/**
 * Cancel an appointment by client
 * Requires at least 2 hours before the scheduled time
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

  // Check cancellation window
  if (!canClientCancel(appointment.date, appointment.startTime)) {
    throw new Error("CANCELLATION_TOO_LATE");
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
    date: formatDateToString(updated.date),
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
    date: formatDateToString(updated.date),
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
 * Get all future appointments for a guest client by phone number
 */
export async function getGuestAppointments(
  phone: string,
): Promise<AppointmentWithDetails[]> {
  const normalizedPhone = phone.replace(/\D/g, "");

  // Find guest client by phone
  const guestClient = await prisma.guestClient.findUnique({
    where: { phone: normalizedPhone },
  });

  if (!guestClient) {
    return []; // No guest client found with this phone
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    date: formatDateToString(apt.date),
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
 * Cancel an appointment by guest client
 * Validates ownership via phone number and respects cancellation window
 */
export async function cancelAppointmentByGuest(
  appointmentId: string,
  phone: string,
): Promise<AppointmentWithDetails> {
  const normalizedPhone = phone.replace(/\D/g, "");

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

  // Check cancellation window
  if (!canClientCancel(appointment.date, appointment.startTime)) {
    throw new Error("CANCELLATION_TOO_LATE");
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
    date: formatDateToString(updated.date),
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
