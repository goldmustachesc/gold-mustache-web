import { prisma } from "@/lib/prisma";
import { AppointmentStatus, type Prisma } from "@prisma/client";
import {
  getBrazilDateString,
  formatPrismaDateToString,
} from "@/utils/time-slots";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import {
  cancelAppointmentInternal,
  createAppointment,
  createAppointmentByBarber,
  getActiveBarbers,
} from "@/services/booking";
import type { AppointmentWithDetails } from "@/types/booking";
import type { AdminCreateAppointmentInput } from "@/lib/validations/admin-appointments";
import { notifyAppointmentCancelledByBarber } from "@/services/notification";

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

  await prisma.appointment
    .update({
      where: { id: appointment.id },
      data: { source: "ADMIN", createdBy: adminProfileId },
    })
    .catch((e) => console.error("Admin audit write failed:", e));

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
    .catch((e) => console.error("Admin audit write failed:", e));

  if (result.clientId && result.service && result.barber) {
    notifyAppointmentCancelledByBarber(result.clientId, {
      serviceName: result.service.name,
      barberName: result.barber.name,
      date: result.date,
      time: result.startTime,
      reason,
    }).catch(() => {});
  }

  return toAdminItem(result);
}

export async function rescheduleAppointmentAsAdmin(): Promise<never> {
  throw new Error("NOT_IMPLEMENTED");
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
