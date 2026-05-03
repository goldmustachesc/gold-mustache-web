import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { AppointmentStatus, type Prisma } from "@prisma/client";
import {
  getBrazilDateString,
  formatPrismaDateToString,
  isDateTimeInPast,
  parseDateString,
  parseDateStringToUTC,
  parseTimeToMinutes,
  roundTimeUpToSlotBoundary,
} from "@/utils/time-slots";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import {
  cancelAppointmentInternal,
  createAppointment,
  createAppointmentByBarber,
  getActiveBarbers,
} from "@/services/booking";
import {
  buildAvailabilityWindows,
  isStartTimeWithinAvailabilityWindows,
} from "@/lib/booking/availability-windows";
import type { AppointmentWithDetails } from "@/types/booking";
import type { AdminCreateAppointmentInput } from "@/lib/validations/admin-appointments";
import {
  notifyAppointmentCancelledByBarber,
  notifyGuestAppointmentCancelledByBarber,
  notifyGuestAppointmentConfirmed,
} from "@/services/notification";
import type { AdminRescheduleAppointmentInput } from "@/lib/validations/admin-appointments";
import { calculateEndTime } from "@/lib/booking/time";

export interface AppointmentAdminItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  source: string;
  cancelReason: string | null;
  createdAt: string;
  barber: { id: string; name: string } | null;
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
  } | null;
  client: { id: string; fullName: string | null; phone: string | null } | null;
  guestClient: { id: string; fullName: string; phone: string } | null;
}

export interface ListAppointmentsFilters {
  startDate?: string;
  endDate?: string;
  barberId?: string;
  status?: AppointmentStatus;
  q?: string;
  orderBy?: "date" | "startTime" | "createdAt" | "status";
  orderDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mapPrismaToAdminItem(apt: {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: AppointmentAdminItem["status"];
  source: AppointmentAdminItem["source"];
  cancelReason: string | null;
  createdAt: Date;
  barber: AppointmentAdminItem["barber"];
  service: {
    id: string;
    name: string;
    price: Prisma.Decimal | number | string;
    duration: number;
  } | null;
  client: AppointmentAdminItem["client"];
  guestClient: AppointmentAdminItem["guestClient"];
}): AppointmentAdminItem {
  return {
    id: apt.id,
    date: formatPrismaDateToString(apt.date),
    startTime: apt.startTime,
    endTime: apt.endTime,
    status: apt.status,
    source: apt.source,
    cancelReason: apt.cancelReason,
    createdAt: apt.createdAt.toISOString(),
    barber: apt.barber,
    service: apt.service
      ? { ...apt.service, price: Number(apt.service.price) }
      : null,
    client: apt.client,
    guestClient: apt.guestClient,
  };
}

export async function listAppointmentsForAdmin(
  filters: ListAppointmentsFilters,
): Promise<{ rows: AppointmentAdminItem[]; total: number }> {
  const today = getBrazilDateString();
  const startDate = filters.startDate ?? today;
  const endDate = filters.endDate ?? addDays(today, 7);
  const limit = filters.limit ?? 20;
  const page = filters.page ?? 1;
  const skip = (page - 1) * limit;

  // q-search: subquery on Profile/GuestClient first to avoid full-table join
  let clientIds: string[] | undefined;
  let guestClientIds: string[] | undefined;

  if (filters.q) {
    const q = filters.q.trim();
    const [profiles, guests] = await Promise.all([
      prisma.profile.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      }),
      prisma.guestClient.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      }),
    ]);
    clientIds = profiles.map((p) => p.id);
    guestClientIds = guests.map((g) => g.id);

    // q matched nothing — short-circuit
    if (clientIds.length === 0 && guestClientIds.length === 0) {
      return { rows: [], total: 0 };
    }
  }

  const startDateObj = parseIsoDateYyyyMmDdAsSaoPauloDate(startDate);
  const endDateObj = parseIsoDateYyyyMmDdAsSaoPauloDate(endDate);

  const where: Prisma.AppointmentWhereInput = {
    date: { gte: startDateObj, lte: endDateObj },
    ...(filters.barberId ? { barberId: filters.barberId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(clientIds !== undefined || guestClientIds !== undefined
      ? {
          OR: [
            ...(clientIds && clientIds.length > 0
              ? [{ clientId: { in: clientIds } }]
              : []),
            ...(guestClientIds && guestClientIds.length > 0
              ? [{ guestClientId: { in: guestClientIds } }]
              : []),
          ],
        }
      : {}),
  };

  const orderField = filters.orderBy ?? "date";
  const dir = filters.orderDir ?? "desc";
  const orderBy: Prisma.AppointmentOrderByWithRelationInput =
    orderField === "startTime"
      ? { startTime: dir }
      : orderField === "createdAt"
        ? { createdAt: dir }
        : orderField === "status"
          ? { status: dir }
          : { date: dir };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        barber: { select: { id: true, name: true } },
        service: {
          select: { id: true, name: true, price: true, duration: true },
        },
        client: { select: { id: true, fullName: true, phone: true } },
        guestClient: { select: { id: true, fullName: true, phone: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    total,
    rows: appointments.map(mapPrismaToAdminItem),
  };
}

function toAdminItem(
  appointment: AppointmentWithDetails,
): AppointmentAdminItem {
  return {
    id: appointment.id,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    source: "ADMIN",
    cancelReason: appointment.cancelReason,
    createdAt: appointment.createdAt,
    barber: appointment.barber
      ? { id: appointment.barber.id, name: appointment.barber.name }
      : null,
    service: appointment.service
      ? {
          id: appointment.service.id,
          name: appointment.service.name,
          price: appointment.service.price,
          duration: appointment.service.duration,
        }
      : null,
    client: appointment.client ?? null,
    guestClient: appointment.guestClient ?? null,
  };
}

type RescheduleAvailabilityResult = {
  error: null | "SHOP_CLOSED" | "BARBER_UNAVAILABLE";
  windows: Array<{ startTime: string; endTime: string }>;
};

async function loadRescheduleAvailability(
  tx: Prisma.TransactionClient,
  params: {
    barberId: string;
    appointmentDateDb: Date;
    appointmentDateLocal: Date;
    excludeAppointmentId: string;
    serviceDuration: number;
  },
): Promise<RescheduleAvailabilityResult> {
  const dayOfWeek = params.appointmentDateLocal.getDay();

  const [
    barber,
    shopHours,
    shopClosures,
    absences,
    workingHours,
    appointments,
  ] = await Promise.all([
    tx.barber.findUnique({
      where: { id: params.barberId },
      select: { active: true },
    }),
    tx.shopHours.findUnique({
      where: { dayOfWeek },
      select: {
        isOpen: true,
        startTime: true,
        endTime: true,
        breakStart: true,
        breakEnd: true,
      },
    }),
    tx.shopClosure.findMany({
      where: { date: params.appointmentDateDb },
      select: { startTime: true, endTime: true },
    }),
    tx.barberAbsence.findMany({
      where: { barberId: params.barberId, date: params.appointmentDateDb },
      select: { startTime: true, endTime: true },
    }),
    tx.workingHours.findUnique({
      where: {
        barberId_dayOfWeek: {
          barberId: params.barberId,
          dayOfWeek,
        },
      },
      select: {
        startTime: true,
        endTime: true,
        breakStart: true,
        breakEnd: true,
      },
    }),
    tx.appointment.findMany({
      where: {
        barberId: params.barberId,
        date: params.appointmentDateDb,
        status: AppointmentStatus.CONFIRMED,
        id: { not: params.excludeAppointmentId },
      },
      select: { startTime: true, endTime: true, status: true },
    }),
  ]);

  if (!barber || !barber.active) {
    return { error: "BARBER_UNAVAILABLE", windows: [] };
  }

  if (
    !shopHours ||
    !shopHours.isOpen ||
    !shopHours.startTime ||
    !shopHours.endTime
  ) {
    return { error: "SHOP_CLOSED", windows: [] };
  }

  if (!workingHours) {
    return { error: "BARBER_UNAVAILABLE", windows: [] };
  }

  return {
    error: null,
    windows: buildAvailabilityWindows({
      workingStartTime: workingHours.startTime,
      workingEndTime: workingHours.endTime,
      breakStart: workingHours.breakStart,
      breakEnd: workingHours.breakEnd,
      serviceDurationMinutes: params.serviceDuration,
      closures: shopClosures,
      absences,
      appointments,
    }),
  };
}

async function lockBarberDateForBooking(
  tx: Pick<Prisma.TransactionClient, "$executeRaw">,
  barberId: string,
  appointmentDateDb: Date,
): Promise<void> {
  const dateKey = formatPrismaDateToString(appointmentDateDb);
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${barberId}), hashtext(${dateKey}))
  `;
}

async function lockClientDateForBooking(
  tx: Pick<Prisma.TransactionClient, "$executeRaw">,
  clientLockKey: string,
  appointmentDateDb: Date,
): Promise<void> {
  const dateKey = formatPrismaDateToString(appointmentDateDb);
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${clientLockKey}), hashtext(${dateKey}))
  `;
}

async function hasOverlappingAppointmentForClientInTx(
  tx: Pick<Prisma.TransactionClient, "appointment">,
  appointmentDate: Date,
  newStartTime: string,
  newEndTime: string,
  identifiers: {
    clientId?: string | null;
    guestClientId?: string | null;
  },
  excludeAppointmentId: string,
): Promise<boolean> {
  const clientFilters: Prisma.AppointmentWhereInput[] = [];

  if (identifiers.clientId) {
    clientFilters.push({ clientId: identifiers.clientId });
  }

  if (identifiers.guestClientId) {
    clientFilters.push({ guestClientId: identifiers.guestClientId });
  }

  if (clientFilters.length === 0) {
    return false;
  }

  const existingAppointments = await tx.appointment.findMany({
    where: {
      date: appointmentDate,
      status: AppointmentStatus.CONFIRMED,
      id: { not: excludeAppointmentId },
      OR: clientFilters,
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const newStartMinutes = parseTimeToMinutes(newStartTime);
  const newEndMinutes = parseTimeToMinutes(newEndTime);

  return existingAppointments.some((apt) => {
    const aptStartMinutes = parseTimeToMinutes(apt.startTime);
    const aptEndMinutes = parseTimeToMinutes(apt.endTime);
    return newStartMinutes < aptEndMinutes && aptStartMinutes < newEndMinutes;
  });
}

export async function createAppointmentAsAdmin(
  input: AdminCreateAppointmentInput,
  adminProfileId: string,
): Promise<AppointmentAdminItem> {
  let appointment: AppointmentWithDetails;

  if (input.clientProfileId) {
    appointment = await createAppointment(
      {
        serviceId: input.serviceId,
        barberId: input.barberId,
        date: input.date,
        startTime: input.startTime,
      },
      input.clientProfileId,
    );
  } else if (input.guest) {
    appointment = await createAppointmentByBarber(
      {
        serviceId: input.serviceId,
        date: input.date,
        startTime: input.startTime,
        clientName: input.guest.name,
        clientPhone: input.guest.phone,
      },
      input.barberId,
    );
  } else {
    throw new Error("VALIDATION_ERROR");
  }

  if (input.guest && appointment.guestClient) {
    const barber = await prisma.barber.findUnique({
      where: { id: appointment.barberId },
      select: { userId: true },
    });

    if (barber) {
      await notifyGuestAppointmentConfirmed(
        appointment.guestClient.phone,
        appointment.guestClient.fullName,
        barber.userId,
        {
          serviceName: appointment.service.name,
          barberName: appointment.barber.name,
          date: appointment.date,
          time: appointment.startTime,
        },
      ).catch((error) => {
        logger.warn(
          {
            error,
            appointmentId: appointment.id,
            barberUserId: barber.userId,
          },
          "Falha ao criar notificação de confirmação para guest",
        );
      });
    }
  }

  await prisma.appointment
    .update({
      where: { id: appointment.id },
      data: { source: "ADMIN", createdBy: adminProfileId },
    })
    .catch((error) => {
      logger.warn(
        { error, appointmentId: appointment.id },
        "Admin audit write failed",
      );
    });

  return toAdminItem(appointment);
}

export async function cancelAppointmentAsAdmin(
  appointmentId: string,
  reason: string,
  adminProfileId: string,
): Promise<AppointmentAdminItem> {
  const result = await cancelAppointmentInternal(appointmentId, {
    newStatus: AppointmentStatus.CANCELLED_BY_BARBER,
    cancelReason: `[ADMIN] ${reason}`,
    bypassCancelWindow: true,
  });

  await prisma.appointment
    .update({
      where: { id: appointmentId },
      data: { cancelledBy: adminProfileId, source: "ADMIN" },
    })
    .catch((error) => {
      logger.warn({ error, appointmentId }, "Admin audit write failed");
    });

  if (result.clientId && result.service && result.barber) {
    const clientProfile = await prisma.profile.findUnique({
      where: { id: result.clientId },
      select: { userId: true, fullName: true },
    });

    if (clientProfile) {
      await notifyAppointmentCancelledByBarber(clientProfile.userId, {
        serviceName: result.service.name,
        barberName: result.barber.name,
        date: result.date,
        time: result.startTime,
        reason,
        recipientName: clientProfile.fullName?.split(" ")[0] ?? "Cliente",
        appointmentId: result.id,
      }).catch((error) => {
        logger.warn(
          {
            error,
            appointmentId: result.id,
            clientUserId: clientProfile.userId,
          },
          "Falha ao criar notificação de cancelamento para cliente",
        );
      });
    }
  } else if (result.guestClient && result.service && result.barber) {
    const barber = await prisma.barber.findUnique({
      where: { id: result.barber.id },
      select: { userId: true },
    });

    if (barber) {
      await notifyGuestAppointmentCancelledByBarber(
        result.guestClient.phone,
        result.guestClient.fullName,
        barber.userId,
        {
          serviceName: result.service.name,
          date: result.date,
          time: result.startTime,
          reason,
        },
      ).catch((error) => {
        logger.warn(
          {
            error,
            appointmentId: result.id,
            barberUserId: barber.userId,
          },
          "Falha ao criar notificação de cancelamento para guest",
        );
      });
    }
  }

  return toAdminItem(result);
}

export async function rescheduleAppointmentAsAdmin(
  appointmentId: string,
  input: AdminRescheduleAppointmentInput,
  adminProfileId: string,
): Promise<AppointmentAdminItem> {
  const startTime = roundTimeUpToSlotBoundary(input.startTime);
  if (!startTime) {
    throw new Error("SLOT_UNAVAILABLE");
  }
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      barber: { select: { id: true, name: true } },
      service: {
        select: { id: true, name: true, price: true, duration: true },
      },
      client: { select: { id: true, fullName: true, phone: true } },
      guestClient: { select: { id: true, fullName: true, phone: true } },
    },
  });

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND");
  }

  const currentDate = formatPrismaDateToString(appointment.date);
  if (currentDate === input.date && appointment.startTime === startTime) {
    return mapPrismaToAdminItem(appointment);
  }

  const requestedDateLocal = parseDateString(input.date);
  if (isDateTimeInPast(requestedDateLocal, startTime)) {
    throw new Error("SLOT_IN_PAST");
  }

  const requestedDateDb = parseDateStringToUTC(input.date);

  return prisma.$transaction(async (tx) => {
    await lockBarberDateForBooking(tx, appointment.barberId, requestedDateDb);

    if (appointment.clientId) {
      await lockClientDateForBooking(
        tx,
        `client:${appointment.clientId}`,
        requestedDateDb,
      );
    } else if (appointment.guestClient?.phone) {
      await lockClientDateForBooking(
        tx,
        `guest-phone:${appointment.guestClient.phone}`,
        requestedDateDb,
      );
    }

    const freshAppointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        barber: { select: { id: true, name: true } },
        service: {
          select: { id: true, name: true, price: true, duration: true },
        },
        client: { select: { id: true, fullName: true, phone: true } },
        guestClient: { select: { id: true, fullName: true, phone: true } },
      },
    });

    if (!freshAppointment) {
      throw new Error("APPOINTMENT_NOT_FOUND");
    }

    if (freshAppointment.status !== AppointmentStatus.CONFIRMED) {
      throw new Error("APPOINTMENT_NOT_RESCHEDULABLE");
    }

    const freshCurrentDate = formatPrismaDateToString(freshAppointment.date);
    if (
      freshCurrentDate === input.date &&
      freshAppointment.startTime === startTime
    ) {
      return mapPrismaToAdminItem(freshAppointment);
    }

    const availability = await loadRescheduleAvailability(tx, {
      barberId: freshAppointment.barberId,
      appointmentDateDb: requestedDateDb,
      appointmentDateLocal: requestedDateLocal,
      excludeAppointmentId: freshAppointment.id,
      serviceDuration: freshAppointment.service.duration,
    });

    if (availability.error) {
      throw new Error(availability.error);
    }

    const fitsAvailability = isStartTimeWithinAvailabilityWindows({
      windows: availability.windows,
      startTime,
      durationMinutes: freshAppointment.service.duration,
    });

    if (!fitsAvailability) {
      throw new Error("SLOT_UNAVAILABLE");
    }

    const newEndTime = calculateEndTime(
      startTime,
      freshAppointment.service.duration,
    );

    const hasClientOverlap = await hasOverlappingAppointmentForClientInTx(
      tx,
      requestedDateDb,
      startTime,
      newEndTime,
      {
        clientId: freshAppointment.clientId,
        guestClientId: freshAppointment.guestClientId,
      },
      freshAppointment.id,
    );

    if (hasClientOverlap) {
      throw new Error("CLIENT_OVERLAPPING_APPOINTMENT");
    }

    const updated = await tx.appointment.update({
      where: { id: freshAppointment.id },
      data: {
        date: requestedDateDb,
        startTime,
        endTime: newEndTime,
        source: "ADMIN",
        rescheduledBy: adminProfileId,
      },
      include: {
        barber: { select: { id: true, name: true } },
        service: {
          select: { id: true, name: true, price: true, duration: true },
        },
        client: { select: { id: true, fullName: true, phone: true } },
        guestClient: { select: { id: true, fullName: true, phone: true } },
      },
    });

    return mapPrismaToAdminItem(updated);
  });
}

export interface CalendarSlot {
  time: string;
  barberId: string;
  barberName: string;
  appointment: AppointmentAdminItem | null;
  blocked: boolean;
  blockedReason?: string;
}

export interface CalendarDay {
  date: string;
  slots: CalendarSlot[];
}

const SLOT_START_MINUTES = 8 * 60;
const SLOT_END_MINUTES = 20 * 60;
const SLOT_INTERVAL_MINUTES = 30;

function generateSlotTimes(): string[] {
  const slots: string[] = [];
  for (
    let mins = SLOT_START_MINUTES;
    mins < SLOT_END_MINUTES;
    mins += SLOT_INTERVAL_MINUTES
  ) {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function getCalendarForAdmin(params: {
  view: "day" | "week";
  date: string;
  barberIds?: string[];
}): Promise<CalendarDay[]> {
  const days = params.view === "week" ? 7 : 1;
  const dates: string[] = [];
  for (let i = 0; i < days; i += 1) {
    dates.push(addDays(params.date, i));
  }

  const startDateObj = parseIsoDateYyyyMmDdAsSaoPauloDate(dates[0]);
  const endDateObj = parseIsoDateYyyyMmDdAsSaoPauloDate(
    dates[dates.length - 1],
  );

  const allBarbers = await getActiveBarbers();
  const barbers =
    params.barberIds && params.barberIds.length > 0
      ? allBarbers.filter((b) => params.barberIds?.includes(b.id))
      : allBarbers;

  const [appointments, absences] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        date: { gte: startDateObj, lte: endDateObj },
        status: AppointmentStatus.CONFIRMED,
        ...(barbers.length > 0
          ? { barberId: { in: barbers.map((b) => b.id) } }
          : {}),
      },
      include: {
        barber: { select: { id: true, name: true } },
        service: {
          select: { id: true, name: true, price: true, duration: true },
        },
        client: { select: { id: true, fullName: true, phone: true } },
        guestClient: { select: { id: true, fullName: true, phone: true } },
      },
    }),
    prisma.barberAbsence.findMany({
      where: {
        date: { gte: startDateObj, lte: endDateObj },
        ...(barbers.length > 0
          ? { barberId: { in: barbers.map((b) => b.id) } }
          : {}),
      },
    }),
  ]);

  const appointmentMap = new Map<string, (typeof appointments)[number]>();
  for (const apt of appointments) {
    const key = `${formatPrismaDateToString(apt.date)}|${apt.barberId}|${apt.startTime}`;
    appointmentMap.set(key, apt);
  }

  const absenceMap = new Map<string, (typeof absences)[number]>();
  for (const abs of absences) {
    const key = `${formatPrismaDateToString(abs.date)}|${abs.barberId}`;
    absenceMap.set(key, abs);
  }

  const slotTimes = generateSlotTimes();
  const calendar: CalendarDay[] = dates.map((date) => {
    const slots: CalendarSlot[] = [];
    for (const barber of barbers) {
      const absence = absenceMap.get(`${date}|${barber.id}`);
      for (const time of slotTimes) {
        const apt = appointmentMap.get(`${date}|${barber.id}|${time}`);

        let blocked = false;
        let blockedReason: string | undefined;
        if (absence) {
          if (!absence.startTime || !absence.endTime) {
            blocked = true;
            blockedReason = absence.reason ?? "Ausência";
          } else {
            const tMin = timeToMinutes(time);
            if (
              tMin >= timeToMinutes(absence.startTime) &&
              tMin < timeToMinutes(absence.endTime)
            ) {
              blocked = true;
              blockedReason = absence.reason ?? "Ausência";
            }
          }
        }

        slots.push({
          time,
          barberId: barber.id,
          barberName: barber.name,
          appointment: apt ? mapPrismaToAdminItem(apt) : null,
          blocked,
          blockedReason,
        });
      }
    }
    return { date, slots };
  });

  return calendar;
}
