import { BarberDashboard } from "@/components/dashboard/BarberDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import {
  formatDateToString,
  getBrazilDateString,
  parseDateString,
} from "@/utils/time-slots";
import {
  getBarberDashboardInitialData,
  getDashboardIdentity,
  getDashboardStatsData,
} from "@/services/dashboard";

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(12, 0, 0, 0);
  return weekStart;
}

function getWeekEnd(date: Date): Date {
  const weekEnd = new Date(date);
  weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
  weekEnd.setHours(12, 0, 0, 0);
  return weekEnd;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dashboardIdentity = await getDashboardIdentity();

  if (!dashboardIdentity) {
    redirect(`/${locale}/login`);
  }

  const queryClient = new QueryClient();
  queryClient.setQueryData(
    ["profile-me", dashboardIdentity.userId],
    dashboardIdentity.profile,
  );

  if (dashboardIdentity.barberProfile) {
    const selectedDate = parseDateString(getBrazilDateString());
    const weekStart = getWeekStart(selectedDate);
    const weekEnd = getWeekEnd(weekStart);
    const weekStartStr = formatDateToString(weekStart);
    const weekEndStr = formatDateToString(weekEnd);
    const barberData = await getBarberDashboardInitialData({
      barberId: dashboardIdentity.barberProfile.id,
      startDate: weekStartStr,
      endDate: weekEndStr,
    });

    queryClient.setQueryData(
      ["barber-profile", dashboardIdentity.userId],
      dashboardIdentity.barberProfile,
    );
    queryClient.setQueryData(["my-working-hours"], barberData.workingHours);
    queryClient.setQueryData(
      [
        "appointments",
        "barber",
        dashboardIdentity.barberProfile.id,
        weekStartStr,
        weekEndStr,
      ],
      barberData.appointments,
    );
    queryClient.setQueryData(
      ["barber-absences", weekStartStr, weekEndStr],
      barberData.absences,
    );

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BarberDashboard
          barberProfile={dashboardIdentity.barberProfile}
          locale={locale}
        />
      </HydrationBoundary>
    );
  }

  const dashboardStats = await getDashboardStatsData({
    profile: dashboardIdentity.profile,
    barberProfile: dashboardIdentity.barberProfile,
  });

  queryClient.setQueryData(["dashboard", "stats", true], dashboardStats);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientDashboard locale={locale} />
    </HydrationBoundary>
  );
}
