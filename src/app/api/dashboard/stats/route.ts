import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatPrismaDateToString } from "@/utils/time-slots";
import type { DashboardStats } from "@/types/dashboard";

/**
 * GET /api/dashboard/stats
 * Returns dashboard statistics based on user role:
 * - Clients: upcoming appointments, visit history, favorite barber/service
 * - Barbers: today's schedule, earnings, weekly stats
 * - Admin: shop-wide statistics
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get user profile and role
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 },
      );
    }

    // Get barber profile if exists
    const barberProfile = await prisma.barber.findUnique({
      where: { userId: user.id },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatPrismaDateToString(today);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Base stats for all users
    const stats: DashboardStats = {
      role: profile.role,
      client: null,
      barber: null,
      admin: null,
    };

    // Client stats (for all users including barbers when viewing as client)
    const clientAppointments = await prisma.appointment.findMany({
      where: {
        clientId: profile.id,
      },
      include: {
        barber: true,
        service: true,
      },
      orderBy: { date: "desc" },
    });

    // Upcoming appointments (future confirmed)
    const upcomingAppointments = clientAppointments
      .filter((apt) => {
        const aptDate = formatPrismaDateToString(apt.date);
        return aptDate >= todayStr && apt.status === "CONFIRMED";
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
          formatPrismaDateToString(apt.date) < todayStr),
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

    // Barber stats
    if (barberProfile) {
      const barberAppointments = await prisma.appointment.findMany({
        where: {
          barberId: barberProfile.id,
          date: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
        include: {
          client: true,
          guestClient: true,
          service: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });

      // Today's appointments
      const todayAppointments = barberAppointments.filter(
        (apt) =>
          formatPrismaDateToString(apt.date) === todayStr &&
          apt.status === "CONFIRMED",
      );

      // Next client (first upcoming today or next day)
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const nextClient = todayAppointments.find(
        (apt) =>
          formatPrismaDateToString(apt.date) === todayStr &&
          apt.startTime > currentTime,
      );

      // Today's earnings (confirmed appointments)
      const todayEarnings = todayAppointments.reduce(
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
      const completedToday = barberAppointments.filter(
        (apt) =>
          formatPrismaDateToString(apt.date) === todayStr &&
          (apt.status === "COMPLETED" ||
            (apt.status === "CONFIRMED" && apt.startTime < currentTime)),
      ).length;

      stats.barber = {
        todayAppointments: todayAppointments.length,
        completedToday,
        pendingToday: todayAppointments.length - completedToday,
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

    // Admin stats
    if (profile.role === "ADMIN") {
      const allTodayAppointments = await prisma.appointment.findMany({
        where: {
          date: today,
          status: "CONFIRMED",
        },
        include: {
          service: true,
        },
      });

      const allWeekAppointments = await prisma.appointment.findMany({
        where: {
          date: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
          status: "CONFIRMED",
        },
        include: {
          service: true,
        },
      });

      const activeBarbers = await prisma.barber.count({
        where: { active: true },
      });

      const totalClients = await prisma.profile.count({
        where: { role: "CLIENT" },
      });

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

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar estatísticas" },
      { status: 500 },
    );
  }
}
