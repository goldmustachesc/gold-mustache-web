import type {
  AppointmentWithDetails,
  BarberAbsenceData,
  BarberWorkingHoursDay,
} from "@/types/booking";
import type { DashboardStats } from "@/types/dashboard";
import type { PaginationMeta } from "@/types/api";
import type { ProfileMeData, UserRole } from "@/types/profile";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { mapPrismaBarberAbsence } from "@/lib/barber-absence-mapper";
import { buildWorkingHoursResponse } from "@/lib/working-hours";
import { normalizePhoneOrNull } from "@/lib/booking/phone";
import { getBarberAppointments } from "@/services/booking";
import {
  formatPrismaDateToString,
  getBrazilDateString,
  getMinutesUntilAppointment,
  parseDateStringToUTC,
} from "@/utils/time-slots";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";

export const MAX_CLIENT_HISTORY = 200;

type ProfileRecord = {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  emailVerified: boolean;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

type AuthenticatedUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    name?: string;
    full_name?: string;
    phone?: string | null;
  };
};

export interface DashboardBarberProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface DashboardIdentity {
  userId: string;
  email: string | null;
  profile: ProfileMeData;
  barberProfile: DashboardBarberProfile | null;
}

export interface BarberDashboardInitialData {
  workingHours: BarberWorkingHoursDay[];
  appointments: AppointmentWithDetails[];
  absences: BarberAbsenceData[];
}

function mapProfile(profile: ProfileRecord): ProfileMeData {
  return {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
    street: profile.street,
    number: profile.number,
    complement: profile.complement,
    neighborhood: profile.neighborhood,
    city: profile.city,
    state: profile.state,
    zipCode: profile.zipCode,
    emailVerified: profile.emailVerified,
    role: profile.role,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

async function getOrCreateProfileForUser(
  user: AuthenticatedUser,
): Promise<ProfileRecord> {
  const existingProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  if (existingProfile) {
    return existingProfile;
  }

  return prisma.profile.create({
    data: {
      userId: user.id,
      fullName:
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        null,
      phone: user.user_metadata?.phone || null,
      phoneNormalized: normalizePhoneOrNull(user.user_metadata?.phone),
    },
  });
}

async function getActiveBarberProfileForUser(
  userId: string,
): Promise<DashboardBarberProfile | null> {
  const barber = await prisma.barber.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      name: true,
      avatarUrl: true,
      active: true,
    },
  });

  if (!barber || !barber.active) {
    return null;
  }

  return {
    id: barber.id,
    name: barber.name,
    avatarUrl: barber.avatarUrl,
  };
}

export async function getDashboardIdentity(): Promise<DashboardIdentity | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [profile, barberProfile] = await Promise.all([
    getOrCreateProfileForUser(user),
    getActiveBarberProfileForUser(user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: mapProfile(profile),
    barberProfile,
  };
}

interface ClientPagination {
  skip: number;
  take: number;
}

interface DashboardStatsInput {
  profile: ProfileMeData;
  barberProfile: DashboardBarberProfile | null;
  includeClientStats?: boolean;
  pagination?: ClientPagination;
}

export async function getDashboardStatsData({
  profile,
  barberProfile,
  includeClientStats = true,
  pagination,
}: DashboardStatsInput): Promise<DashboardStats & { meta?: PaginationMeta }> {
  const todayStr = getBrazilDateString();
  const today = parseDateStringToUTC(todayStr);
  const todayBusinessDate = parseIsoDateYyyyMmDdAsSaoPauloDate(todayStr);
  const dayOfWeek = todayBusinessDate.getUTCDay();

  const startOfWeek = new Date(today);
  startOfWeek.setUTCDate(today.getUTCDate() - dayOfWeek);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);

  const stats: DashboardStats = {
    role: profile.role,
    client: null,
    barber: null,
    admin: null,
  };

  const shouldLoadClientStats = includeClientStats || profile.role !== "BARBER";
  const clientWhere = { clientId: profile.id };
  const take = pagination?.take ?? MAX_CLIENT_HISTORY;
  const skip = pagination?.skip ?? 0;

  const [clientAppointments, clientTotal, barberAppointments] =
    await Promise.all([
      shouldLoadClientStats
        ? prisma.appointment.findMany({
            where: clientWhere,
            include: {
              barber: {
                select: { id: true, name: true, avatarUrl: true },
              },
              service: {
                select: { id: true, name: true, duration: true, price: true },
              },
            },
            orderBy: { date: "desc" },
            skip,
            take,
          })
        : Promise.resolve(null),
      shouldLoadClientStats
        ? prisma.appointment.count({ where: clientWhere })
        : Promise.resolve(0),
      barberProfile
        ? prisma.appointment.findMany({
            where: {
              barberId: barberProfile.id,
              date: { gte: startOfWeek, lte: endOfWeek },
            },
            include: {
              client: { select: { fullName: true } },
              guestClient: { select: { fullName: true } },
              service: {
                select: { name: true, price: true, duration: true },
              },
            },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
          })
        : Promise.resolve(null),
    ]);

  if (clientAppointments) {
    const upcomingAppointments = clientAppointments
      .filter((appointment) => {
        const appointmentDate = formatPrismaDateToString(appointment.date);
        return (
          appointment.status === "CONFIRMED" &&
          getMinutesUntilAppointment(appointmentDate, appointment.startTime) > 0
        );
      })
      .sort((left, right) => {
        const dateCompare = formatPrismaDateToString(left.date).localeCompare(
          formatPrismaDateToString(right.date),
        );
        if (dateCompare !== 0) {
          return dateCompare;
        }
        return left.startTime.localeCompare(right.startTime);
      });

    const nextAppointment = upcomingAppointments[0] || null;
    const completedAppointments = clientAppointments.filter(
      (appointment) =>
        appointment.status === "COMPLETED" ||
        (appointment.status === "CONFIRMED" &&
          getMinutesUntilAppointment(
            formatPrismaDateToString(appointment.date),
            appointment.startTime,
          ) <= 0),
    );

    const totalVisits = completedAppointments.length;
    const totalSpent = completedAppointments.reduce(
      (sum, appointment) => sum + Number(appointment.service.price),
      0,
    );

    const barberCounts = completedAppointments.reduce<Record<string, number>>(
      (counts, appointment) => {
        counts[appointment.barberId] = (counts[appointment.barberId] || 0) + 1;
        return counts;
      },
      {},
    );

    const favoriteBarberEntry = Object.entries(barberCounts).sort(
      (left, right) => right[1] - left[1],
    )[0];
    const favoriteBarber = favoriteBarberEntry
      ? completedAppointments.find(
          (appointment) => appointment.barberId === favoriteBarberEntry[0],
        )?.barber || null
      : null;

    const serviceCounts = completedAppointments.reduce<Record<string, number>>(
      (counts, appointment) => {
        counts[appointment.serviceId] =
          (counts[appointment.serviceId] || 0) + 1;
        return counts;
      },
      {},
    );

    const favoriteServiceEntry = Object.entries(serviceCounts).sort(
      (left, right) => right[1] - left[1],
    )[0];
    const favoriteService = favoriteServiceEntry
      ? completedAppointments.find(
          (appointment) => appointment.serviceId === favoriteServiceEntry[0],
        )?.service || null
      : null;

    const lastAppointment = completedAppointments[0] || null;

    stats.client = {
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            date: formatPrismaDateToString(nextAppointment.date),
            startTime: nextAppointment.startTime,
            endTime: nextAppointment.endTime,
            barber: {
              id: nextAppointment.barber.id,
              name: nextAppointment.barber.name,
              avatarUrl: nextAppointment.barber.avatarUrl,
            },
            service: {
              id: nextAppointment.service.id,
              name: nextAppointment.service.name,
              duration: nextAppointment.service.duration,
              price: Number(nextAppointment.service.price),
            },
          }
        : null,
      upcomingCount: upcomingAppointments.length,
      totalVisits,
      totalSpent,
      favoriteBarber: favoriteBarber
        ? {
            id: favoriteBarber.id,
            name: favoriteBarber.name,
            avatarUrl: favoriteBarber.avatarUrl,
            visitCount: favoriteBarberEntry?.[1] || 0,
          }
        : null,
      favoriteService: favoriteService
        ? {
            id: favoriteService.id,
            name: favoriteService.name,
            useCount: favoriteServiceEntry?.[1] || 0,
          }
        : null,
      lastService: lastAppointment
        ? {
            serviceId: lastAppointment.service.id,
            serviceName: lastAppointment.service.name,
            barberId: lastAppointment.barber.id,
            barberName: lastAppointment.barber.name,
          }
        : null,
    };
  }

  if (barberAppointments) {
    const isAppointmentInFuture = (date: Date, startTime: string) =>
      getMinutesUntilAppointment(formatPrismaDateToString(date), startTime) > 0;

    const todayAppointments = barberAppointments.filter(
      (appointment) => formatPrismaDateToString(appointment.date) === todayStr,
    );
    const todayConfirmedAppointments = todayAppointments.filter(
      (appointment) => appointment.status === "CONFIRMED",
    );
    const nextClient = todayConfirmedAppointments.find((appointment) =>
      isAppointmentInFuture(appointment.date, appointment.startTime),
    );

    const todayEarnings = todayConfirmedAppointments.reduce(
      (sum, appointment) => sum + Number(appointment.service.price),
      0,
    );

    const weekConfirmedAppointments = barberAppointments.filter(
      (appointment) => appointment.status === "CONFIRMED",
    );
    const weekEarnings = weekConfirmedAppointments.reduce(
      (sum, appointment) => sum + Number(appointment.service.price),
      0,
    );

    const completedToday = todayAppointments.filter(
      (appointment) =>
        appointment.status === "COMPLETED" ||
        (appointment.status === "CONFIRMED" &&
          !isAppointmentInFuture(appointment.date, appointment.startTime)),
    ).length;

    const pendingToday = todayConfirmedAppointments.filter((appointment) =>
      isAppointmentInFuture(appointment.date, appointment.startTime),
    ).length;

    stats.barber = {
      todayAppointments: todayConfirmedAppointments.length,
      completedToday,
      pendingToday,
      todayEarnings,
      weekAppointments: weekConfirmedAppointments.length,
      weekEarnings,
      nextClient: nextClient
        ? {
            time: nextClient.startTime,
            clientName:
              nextClient.client?.fullName ||
              nextClient.guestClient?.fullName ||
              "Cliente",
            serviceName: nextClient.service.name,
            duration: nextClient.service.duration,
          }
        : null,
    };
  }

  if (profile.role === "ADMIN") {
    const [
      allTodayAppointments,
      allWeekAppointments,
      activeBarbers,
      totalClients,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: { date: today, status: "CONFIRMED" },
        include: { service: { select: { price: true } } },
      }),
      prisma.appointment.findMany({
        where: {
          date: { gte: startOfWeek, lte: endOfWeek },
          status: "CONFIRMED",
        },
        include: { service: { select: { price: true } } },
      }),
      prisma.barber.count({ where: { active: true } }),
      prisma.profile.count({ where: { role: "CLIENT" } }),
    ]);

    stats.admin = {
      todayAppointments: allTodayAppointments.length,
      todayRevenue: allTodayAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.service.price),
        0,
      ),
      weekAppointments: allWeekAppointments.length,
      weekRevenue: allWeekAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.service.price),
        0,
      ),
      activeBarbers,
      totalClients,
    };
  }

  const meta: PaginationMeta | undefined = shouldLoadClientStats
    ? {
        total: clientTotal,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(clientTotal / take),
      }
    : undefined;

  return { ...stats, meta };
}

interface BarberDashboardInitialDataInput {
  barberId: string;
  startDate: string;
  endDate: string;
}

export async function getBarberDashboardInitialData({
  barberId,
  startDate,
  endDate,
}: BarberDashboardInitialDataInput): Promise<BarberDashboardInitialData> {
  const start = parseDateStringToUTC(startDate);
  const end = parseDateStringToUTC(endDate);
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const [workingHours, appointments, absences] = await Promise.all([
    prisma.workingHours.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: "asc" },
    }),
    getBarberAppointments(barberId, { start, end }),
    prisma.barberAbsence.findMany({
      where: {
        barberId,
        date: {
          gte: start,
          lt: endExclusive,
        },
      },
      include: { recurrence: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return {
    workingHours: buildWorkingHoursResponse(workingHours),
    appointments,
    absences: absences.map((absence) =>
      mapPrismaBarberAbsence(
        absence as Parameters<typeof mapPrismaBarberAbsence>[0],
      ),
    ),
  };
}
