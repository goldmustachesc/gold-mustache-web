"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { BarberSidebar } from "./BarberSidebar";
import { BarberStatsCards } from "./BarberStatsCards";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { DailySchedule } from "./DailySchedule";
import {
  useBarberAppointments,
  useCancelAppointmentByBarber,
  useMarkNoShow,
} from "@/hooks/useBooking";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { Menu, ArrowRight, Eye, EyeOff, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  formatDateToString,
  getBrazilDateString,
  parseDateString,
} from "@/utils/time-slots";
import Link from "next/link";
import Image from "next/image";
import { NotificationPanel } from "@/components/notifications";

interface BarberDashboardProps {
  locale: string;
}

// Helper to get start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(12, 0, 0, 0);
  return d;
}

// Helper to get end of week (Saturday)
function getWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(12, 0, 0, 0);
  return d;
}

export function BarberDashboard({ locale }: BarberDashboardProps) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const { data: stats } = useDashboardStats();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hideValues, setHideValues] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseDateString(getBrazilDateString()),
  );
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(selectedDate),
  );

  // Redirect non-barbers
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  useEffect(() => {
    if (!barberLoading && user && !barberProfile) {
      toast.error("Acesso restrito a barbeiros");
      router.push(`/${locale}/dashboard`);
    }
  }, [barberProfile, barberLoading, user, router, locale]);

  const barberId = barberProfile?.id ?? null;
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);

  const { data: appointments = [], isLoading: appointmentsLoading } =
    useBarberAppointments(barberId, weekStart, weekEnd);

  const cancelAppointment = useCancelAppointmentByBarber();
  const markNoShow = useMarkNoShow();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [markingNoShowId, setMarkingNoShowId] = useState<string | null>(null);

  const handleCancelAppointment = async (
    appointmentId: string,
    reason: string,
  ) => {
    setCancellingId(appointmentId);
    try {
      await cancelAppointment.mutateAsync({ appointmentId, reason });
      toast.success("Agendamento cancelado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar");
    } finally {
      setCancellingId(null);
    }
  };

  const handleMarkNoShow = async (appointmentId: string) => {
    setMarkingNoShowId(appointmentId);
    try {
      await markNoShow.mutateAsync({ appointmentId });
      toast.success("Cliente marcado como não compareceu.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao marcar ausência",
      );
    } finally {
      setMarkingNoShowId(null);
    }
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(
      newWeekStart.getDate() + (direction === "next" ? 7 : -7),
    );
    setWeekStart(newWeekStart);

    setSelectedDate((prev) => {
      const nextSelected = new Date(prev);
      nextSelected.setDate(
        nextSelected.getDate() + (direction === "next" ? 7 : -7),
      );
      nextSelected.setHours(12, 0, 0, 0);
      return nextSelected;
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Filter appointments for selected date
  const selectedDateStr = formatDateToString(selectedDate);
  const dailyAppointments = appointments.filter(
    (apt) => apt.date === selectedDateStr,
  );

  const isLoading = userLoading || barberLoading || appointmentsLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="animate-pulse text-zinc-400">Carregando...</div>
      </div>
    );
  }

  const firstName = barberProfile.name?.split(" ")[0] || "Barbeiro";

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          {/* Logo (visible on desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Gold Mustache"
                width={40}
                height={40}
                className="rounded-full"
              />
              <BrandWordmark className="text-xl">GOLD MUSTACHE</BrandWordmark>
            </Link>
          </div>

          {/* Greeting (visible on mobile) */}
          <div className="lg:hidden">
            <h1 className="text-2xl font-bold">Olá, {firstName}</h1>
            <p className="text-sm text-zinc-400 flex items-center gap-1">
              Você está em sua agenda.
              <span className="text-zinc-600">▼</span>
            </p>
          </div>

          {/* Desktop greeting */}
          <div className="hidden lg:block flex-1 text-center">
            <h1 className="text-xl font-bold">
              Olá, {firstName}!{" "}
              <span className="text-zinc-400 font-normal">
                Você está em sua agenda.
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop: New Appointment Button */}
            <Link
              href={`/${locale}/barbeiro/agendar`}
              className="hidden lg:block"
            >
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </Link>

            {/* Notifications */}
            {user?.id && <NotificationPanel userId={user.id} />}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHideValues((prev) => !prev)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              title={hideValues ? "Mostrar valores" : "Ocultar valores"}
            >
              {hideValues ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24 lg:pb-8">
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Weekly Calendar */}
          <div className="px-4 pt-4">
            <WeeklyCalendar
              weekStart={weekStart}
              appointments={appointments}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onWeekChange={handleWeekChange}
              variant="compact"
            />
          </div>

          {/* Stats Cards */}
          <div className="px-4 pt-4">
            <BarberStatsCards
              todayCount={stats?.barber?.todayAppointments ?? 0}
              todayRevenue={stats?.barber?.todayEarnings ?? 0}
              weekCount={stats?.barber?.weekAppointments ?? 0}
              weekRevenue={stats?.barber?.weekEarnings ?? 0}
              hideValues={hideValues}
            />
          </div>

          {/* Daily Schedule */}
          <div className="px-4 pt-6">
            <DailySchedule
              date={selectedDate}
              appointments={dailyAppointments}
              onCancelAppointment={handleCancelAppointment}
              isCancelling={cancelAppointment.isPending}
              cancellingId={cancellingId}
              onMarkNoShow={handleMarkNoShow}
              isMarkingNoShow={markNoShow.isPending}
              markingNoShowId={markingNoShowId}
              variant="compact"
              hideValues={hideValues}
            />
          </div>
        </div>

        {/* Desktop Layout - Two Column */}
        <div className="hidden lg:block">
          <div className="max-w-7xl mx-auto px-8 py-6">
            {/* Stats Cards - Full Width */}
            <div className="mb-6">
              <BarberStatsCards
                todayCount={stats?.barber?.todayAppointments ?? 0}
                todayRevenue={stats?.barber?.todayEarnings ?? 0}
                weekCount={stats?.barber?.weekAppointments ?? 0}
                weekRevenue={stats?.barber?.weekEarnings ?? 0}
                hideValues={hideValues}
              />
            </div>

            {/* Two Column Grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Calendar */}
              <div className="col-span-4">
                <div className="sticky top-24 bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50">
                  <WeeklyCalendar
                    weekStart={weekStart}
                    appointments={appointments}
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    onWeekChange={handleWeekChange}
                    variant="compact"
                  />
                </div>
              </div>

              {/* Right Column - Schedule */}
              <div className="col-span-8">
                <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50 min-h-[500px]">
                  <h2 className="text-lg font-semibold text-zinc-200 mb-4">
                    Agendamentos do dia
                  </h2>
                  <DailySchedule
                    date={selectedDate}
                    appointments={dailyAppointments}
                    onCancelAppointment={handleCancelAppointment}
                    isCancelling={cancelAppointment.isPending}
                    cancellingId={cancellingId}
                    onMarkNoShow={handleMarkNoShow}
                    isMarkingNoShow={markNoShow.isPending}
                    markingNoShowId={markingNoShowId}
                    variant="compact"
                    hideValues={hideValues}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button - Mobile Only */}
      <div className="fixed bottom-6 left-4 right-4 z-20 lg:hidden">
        <Link href={`/${locale}/barbeiro/agendar`}>
          <Button
            size="lg"
            className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-between px-6"
          >
            <span>Novo Agendamento</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Sidebar */}
      <BarberSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        locale={locale}
      />
    </div>
  );
}
