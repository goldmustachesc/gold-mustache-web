import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import {
  formatPrismaDateToString,
  getBrazilDateString,
  getMinutesUntilAppointment,
  parseDateStringToUTC,
} from "@/utils/time-slots";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import type { DashboardStats } from "@/types/dashboard";
import { apiSuccess, apiError } from "@/lib/api/response";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const rateLimitResult = await checkRateLimit(
      "api",
      getUserRateLimitIdentifier(user.id),
    );
    if (!rateLimitResult.success) {
      return apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
    }

    const [profile, barberProfile] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: user.id },
      }),
      prisma.barber.findUnique({
        where: { userId: user.id },
      }),
    ]);

    if (!profile) {
      return apiError("NOT_FOUND", "Perfil não encontrado", 404);
    }

    const todayStr = getBrazilDateString();
    const today = parseDateStringToUTC(todayStr);
    const todayBusinessDate = parseIsoDateYyyyMmDdAsSaoPauloDate(todayStr);
    const dayOfWeek = todayBusinessDate.getUTCDay();

    const startOfWeek = new Date(today);
    startOfWeek.setUTCDate(today.getUTCDate() - dayOfWeek);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);

    // Base stats for all users
    const stats: DashboardStats = {
      role: profile.role,
      client: null,
      barber: null,
      admin: null,
    };

    const MAX_CLIENT_HISTORY = 200;

    const [clientAppointments, barberAppointments] = await Promise.all([
      prisma.appointment.findMany({
        where: { clientId: profile.id },
        include: { barber: true, service: true },
        orderBy: { date: "desc" },
        take: MAX_CLIENT_HISTORY,
      }),
      barberProfile
        ? prisma.appointment.findMany({
            where: {
              barberId: barberProfile.id,
              date: { gte: startOfWeek, lte: endOfWeek },
            },
            include: { client: true, guestClient: true, service: true },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
          })
        : Promise.resolve(null),
    ]);

    // Upcoming appointments (future confirmed)
    const upcomingAppointments = clientAppointments
      .filter((apt) => {
        const aptDate = formatPrismaDateToString(apt.date);
        return (
          apt.status === "CONFIRMED" &&
          getMinutesUntilAppointment(aptDate, apt.startTime) > 0
        );
      })
      .sort((a, b) => {
        const dateCompare = formatPrismaDateToString(a.date).localeCompare(
          formatPrismaDateToString(b.date),
        );
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });

    const nextAppointment = upcomingAppointments[0] || null;

    // History stats
    const completedAppointments = clientAppointments.filter(
      (apt) =>
        apt.status === "COMPLETED" ||
        (apt.status === "CONFIRMED" &&
          getMinutesUntilAppointment(
            formatPrismaDateToString(apt.date),
            apt.startTime,
          ) <= 0),
    );

    const totalVisits = completedAppointments.length;
    const totalSpent = completedAppointments.reduce(
      (sum, apt) => sum + Number(apt.service.price),
      0,
    );

    // Favorite barber (most visits)
    const barberCounts = completedAppointments.reduce(
      (acc, apt) => {
        acc[apt.barberId] = (acc[apt.barberId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const favoriteBarberEntry = Object.entries(barberCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const favoriteBarber = favoriteBarberEntry
      ? completedAppointments.find(
          (apt) => apt.barberId === favoriteBarberEntry[0],
        )?.barber || null
      : null;

    // Favorite service (most used)
    const serviceCounts = completedAppointments.reduce(
      (acc, apt) => {
        acc[apt.serviceId] = (acc[apt.serviceId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const favoriteServiceEntry = Object.entries(serviceCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const favoriteService = favoriteServiceEntry
      ? completedAppointments.find(
          (apt) => apt.serviceId === favoriteServiceEntry[0],
        )?.service || null
      : null;

    // Last service for quick rebooking
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

    if (barberAppointments) {
      const isAppointmentInFuture = (date: Date, startTime: string) =>
        getMinutesUntilAppointment(formatPrismaDateToString(date), startTime) >
        0;

      const todayAppointments = barberAppointments.filter(
        (apt) => formatPrismaDateToString(apt.date) === todayStr,
      );
      const todayConfirmedAppointments = todayAppointments.filter(
        (apt) => apt.status === "CONFIRMED",
      );

      const nextClient = todayConfirmedAppointments.find((apt) =>
        isAppointmentInFuture(apt.date, apt.startTime),
      );

      // Today's earnings (confirmed appointments)
      const todayEarnings = todayConfirmedAppointments.reduce(
        (sum, apt) => sum + Number(apt.service.price),
        0,
      );

      // Week stats
      const weekConfirmed = barberAppointments.filter(
        (apt) => apt.status === "CONFIRMED",
      );
      const weekEarnings = weekConfirmed.reduce(
        (sum, apt) => sum + Number(apt.service.price),
        0,
      );

      // Completed today
      const completedToday = todayAppointments.filter(
        (apt) =>
          apt.status === "COMPLETED" ||
          (apt.status === "CONFIRMED" &&
            !isAppointmentInFuture(apt.date, apt.startTime)),
      ).length;
      const pendingToday = todayConfirmedAppointments.filter((apt) =>
        isAppointmentInFuture(apt.date, apt.startTime),
      ).length;

      stats.barber = {
        todayAppointments: todayConfirmedAppointments.length,
        completedToday,
        pendingToday,
        todayEarnings,
        weekAppointments: weekConfirmed.length,
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
          (sum, apt) => sum + Number(apt.service.price),
          0,
        ),
        weekAppointments: allWeekAppointments.length,
        weekRevenue: allWeekAppointments.reduce(
          (sum, apt) => sum + Number(apt.service.price),
          0,
        ),
        activeBarbers,
        totalClients,
      };
    }

    const response = apiSuccess(stats);
    response.headers.set(
      "Cache-Control",
      "private, s-maxage=30, stale-while-revalidate=60",
    );
    return response;
  } catch (error) {
    return handlePrismaError(error, "Erro ao carregar estatísticas");
  }
}
