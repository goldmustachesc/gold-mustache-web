"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BarberStatsCards } from "./BarberStatsCards";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { DailySchedule } from "./DailySchedule";
import {
  useBarberAppointments,
  useCancelAppointmentByBarber,
  useMarkNoShow,
  useMarkCompleted,
} from "@/hooks/useBooking";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { useMyWorkingHours } from "@/hooks/useBarberWorkingHours";
import { useBarberAbsences } from "@/hooks/useBarberAbsences";
import {
  usePrivateHeader,
  PrivateHeaderActions,
} from "@/components/private/PrivateHeaderContext";
import {
  CalendarOff,
  Eye,
  EyeOff,
  Plus,
  Calendar,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import {
  formatDateToString,
  getBrazilDateString,
  parseDateString,
} from "@/utils/time-slots";
import Link from "next/link";

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
  const { data: workingHours } = useMyWorkingHours();

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
  const weekStartStr = formatDateToString(weekStart);
  const weekEndStr = formatDateToString(weekEnd);

  const { data: appointments = [], isLoading: appointmentsLoading } =
    useBarberAppointments(barberId, weekStart, weekEnd);
  const { data: absences = [], isLoading: absencesLoading } = useBarberAbsences(
    weekStartStr,
    weekEndStr,
  );

  const cancelAppointment = useCancelAppointmentByBarber();
  const markNoShow = useMarkNoShow();
  const markCompleted = useMarkCompleted();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [markingNoShowId, setMarkingNoShowId] = useState<string | null>(null);
  const [markingCompleteId, setMarkingCompleteId] = useState<string | null>(
    null,
  );

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

  const handleMarkComplete = async (appointmentId: string) => {
    setMarkingCompleteId(appointmentId);
    try {
      await markCompleted.mutateAsync({ appointmentId });
      toast.success("Atendimento concluído com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao concluir atendimento",
      );
    } finally {
      setMarkingCompleteId(null);
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
  const absencesPageHref = `/${locale}/barbeiro/ausencias?date=${selectedDateStr}`;
  const selectedDateAbsences = useMemo(
    () => absences.filter((absence) => absence.date === selectedDateStr),
    [absences, selectedDateStr],
  );
  const weekAbsenceDates = useMemo(
    () => [...new Set(absences.map((absence) => absence.date))],
    [absences],
  );

  // Get working hours for the selected day
  const selectedDayWorkingHours = useMemo(() => {
    if (!workingHours) return null;
    const dayOfWeek = selectedDate.getDay();
    return workingHours.find((wh) => wh.dayOfWeek === dayOfWeek) ?? null;
  }, [workingHours, selectedDate]);
  const handleCreateAppointmentFromSlot = (startTime: string) => {
    const params = new URLSearchParams({
      date: selectedDateStr,
      time: startTime,
    });
    router.push(`/${locale}/barbeiro/agendar?${params.toString()}`);
  };
  const handleCreateAbsenceFromSlot = (startTime: string, endTime: string) => {
    const params = new URLSearchParams({
      date: selectedDateStr,
      startTime,
      endTime,
      allDay: "false",
    });
    router.push(`/${locale}/barbeiro/ausencias?${params.toString()}`);
  };

  const isLoading =
    userLoading || barberLoading || appointmentsLoading || absencesLoading;

  const firstName = barberProfile?.name?.split(" ")[0] || "Barbeiro";

  usePrivateHeader({
    title: `Olá, ${firstName}`,
    icon: Calendar,
  });

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <PrivateHeaderActions>
        {/* Mobile: CTA + Dropdown para ações secundárias */}
        <div className="flex items-center gap-1 lg:hidden">
          <Link href={`/${locale}/barbeiro/agendar`}>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agendar
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Mais ações"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  href={absencesPageHref}
                  className="flex items-center gap-2"
                >
                  <CalendarOff className="h-4 w-4" />
                  Nova Ausência
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setHideValues((prev) => !prev)}
                className="flex items-center gap-2"
              >
                {hideValues ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                {hideValues ? "Mostrar Valores" : "Ocultar Valores"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop: CTAs completos */}
        <Link href={`/${locale}/barbeiro/agendar`} className="hidden lg:block">
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </Link>

        <Link href={absencesPageHref} className="hidden lg:block">
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <CalendarOff className="h-4 w-4 mr-2" />
            Nova Ausência
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setHideValues((prev) => !prev)}
          className="hidden lg:flex text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
          title={hideValues ? "Mostrar valores" : "Ocultar valores"}
        >
          {hideValues ? (
            <Eye className="h-5 w-5" />
          ) : (
            <EyeOff className="h-5 w-5" />
          )}
        </Button>
      </PrivateHeaderActions>
      <main className="pb-6 lg:pb-8">
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Weekly Calendar */}
          <div className="px-4 pt-4">
            <WeeklyCalendar
              weekStart={weekStart}
              appointments={appointments}
              absenceDates={weekAbsenceDates}
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
              onMarkComplete={handleMarkComplete}
              isMarkingComplete={markCompleted.isPending}
              markingCompleteId={markingCompleteId}
              variant="compact"
              hideValues={hideValues}
              workingHours={selectedDayWorkingHours}
              absences={selectedDateAbsences}
              onCreateAppointmentFromSlot={handleCreateAppointmentFromSlot}
              onCreateAbsenceFromSlot={handleCreateAbsenceFromSlot}
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
                <div className="sticky top-24 bg-card/50 rounded-2xl p-4 border border-border/70">
                  <WeeklyCalendar
                    weekStart={weekStart}
                    appointments={appointments}
                    absenceDates={weekAbsenceDates}
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    onWeekChange={handleWeekChange}
                    variant="compact"
                  />
                </div>
              </div>

              {/* Right Column - Schedule */}
              <div className="col-span-8">
                <div className="bg-card/30 rounded-2xl p-6 border border-border/70 min-h-[500px]">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
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
                    onMarkComplete={handleMarkComplete}
                    isMarkingComplete={markCompleted.isPending}
                    markingCompleteId={markingCompleteId}
                    variant="compact"
                    hideValues={hideValues}
                    workingHours={selectedDayWorkingHours}
                    absences={selectedDateAbsences}
                    onCreateAppointmentFromSlot={
                      handleCreateAppointmentFromSlot
                    }
                    onCreateAbsenceFromSlot={handleCreateAbsenceFromSlot}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
