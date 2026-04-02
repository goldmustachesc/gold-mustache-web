"use client";

import { useState, useMemo } from "react";
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
import { consolidateOperationalAppointments } from "@/lib/booking/operational-appointments";

interface BarberDashboardProps {
  locale: string;
  barberProfile: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
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

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function appointmentsMatchWeekRange(
  appointments: Array<{ date: string }>,
  weekStart: string,
  weekEnd: string,
): boolean {
  return appointments.every((appointment) =>
    isDateInRange(appointment.date, weekStart, weekEnd),
  );
}

function BarberStatsCardsSkeleton() {
  return (
    <div data-testid="stats-cards-loading" className="grid grid-cols-2 gap-3">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="rounded-2xl border border-border bg-card/60 p-4"
        >
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-20 rounded bg-muted/70" />
            <div className="h-4 w-24 rounded bg-muted/60" />
            <div className="h-12 w-16 rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyScheduleSkeleton() {
  return (
    <div
      data-testid="daily-schedule-loading"
      className="space-y-3 rounded-2xl border border-border bg-card/30 p-4"
    >
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="rounded-xl border border-border/70 bg-card/50 p-4"
        >
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-24 rounded bg-muted/70" />
            <div className="h-5 w-40 rounded bg-muted/60" />
            <div className="h-3 w-32 rounded bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BarberDashboard({
  locale,
  barberProfile,
}: BarberDashboardProps) {
  const router = useRouter();
  const { data: workingHours } = useMyWorkingHours();

  const [hideValues, setHideValues] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseDateString(getBrazilDateString()),
  );
  const currentWeekReferenceDate = useMemo(
    () => parseDateString(getBrazilDateString()),
    [],
  );
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(selectedDate),
  );
  const currentWeekStart = useMemo(
    () => getWeekStart(currentWeekReferenceDate),
    [currentWeekReferenceDate],
  );

  const barberId = barberProfile.id;
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const currentWeekEnd = useMemo(
    () => getWeekEnd(currentWeekStart),
    [currentWeekStart],
  );
  const weekStartStr = formatDateToString(weekStart);
  const weekEndStr = formatDateToString(weekEnd);
  const currentWeekStartStr = formatDateToString(currentWeekStart);
  const currentWeekEndStr = formatDateToString(currentWeekEnd);
  const isViewingCurrentWeek = weekStartStr === currentWeekStartStr;

  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    isFetching: appointmentsFetching,
  } = useBarberAppointments(barberId, weekStart, weekEnd);
  const {
    data: currentWeekAppointments = [],
    isLoading: currentWeekAppointmentsLoading,
    isFetching: currentWeekAppointmentsFetching,
  } = useBarberAppointments(barberId, currentWeekStart, currentWeekEnd);
  const {
    data: absences = [],
    isLoading: absencesLoading,
    isFetching: absencesFetching,
  } = useBarberAbsences(weekStartStr, weekEndStr);

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
  const dailyAppointments = useMemo(
    () =>
      consolidateOperationalAppointments(
        appointments.filter((apt) => apt.date === selectedDateStr),
      ),
    [appointments, selectedDateStr],
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
  const areSelectedWeekAppointmentsStale =
    appointments.length > 0 &&
    !appointmentsMatchWeekRange(appointments, weekStartStr, weekEndStr);
  const areSelectedWeekAbsencesStale =
    absences.length > 0 &&
    !appointmentsMatchWeekRange(absences, weekStartStr, weekEndStr);
  const areCurrentWeekAppointmentsStale =
    currentWeekAppointments.length > 0 &&
    !appointmentsMatchWeekRange(
      currentWeekAppointments,
      currentWeekStartStr,
      currentWeekEndStr,
    );
  const isInitialAppointmentsLoading =
    appointmentsLoading && appointments.length === 0;
  const isInitialAbsencesLoading = absencesLoading && absences.length === 0;
  const isSelectedWeekDataStale =
    (appointmentsFetching && areSelectedWeekAppointmentsStale) ||
    (absencesFetching && areSelectedWeekAbsencesStale);
  const statsAppointments = isViewingCurrentWeek
    ? appointments
    : currentWeekAppointments;
  const isStatsLoading = isViewingCurrentWeek
    ? isInitialAppointmentsLoading || isSelectedWeekDataStale
    : (currentWeekAppointmentsLoading &&
        currentWeekAppointments.length === 0) ||
      (currentWeekAppointmentsFetching && areCurrentWeekAppointmentsStale);
  const isScheduleLoading =
    isInitialAppointmentsLoading ||
    isInitialAbsencesLoading ||
    isSelectedWeekDataStale;
  const calendarAppointments = areSelectedWeekAppointmentsStale
    ? []
    : appointments;
  const calendarAbsenceDates = areSelectedWeekAbsencesStale
    ? []
    : weekAbsenceDates;
  const barberStats = useMemo(() => {
    const todayStr = getBrazilDateString();
    const confirmedAppointments = statsAppointments.filter(
      (appointment) => appointment.status === "CONFIRMED",
    );
    const todayConfirmedAppointments = confirmedAppointments.filter(
      (appointment) => appointment.date === todayStr,
    );

    return {
      todayCount: todayConfirmedAppointments.length,
      todayRevenue: todayConfirmedAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.service.price),
        0,
      ),
      weekCount: confirmedAppointments.length,
      weekRevenue: confirmedAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.service.price),
        0,
      ),
    };
  }, [statsAppointments]);
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

  const firstName = barberProfile.name.split(" ")[0] || "Barbeiro";

  usePrivateHeader({
    title: `Olá, ${firstName}`,
    icon: Calendar,
  });

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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:px-8 lg:py-6">
          <div className="order-1 lg:order-2 lg:col-span-4">
            <div className="lg:sticky lg:top-24 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/50 lg:p-4">
              <WeeklyCalendar
                weekStart={weekStart}
                appointments={calendarAppointments}
                absenceDates={calendarAbsenceDates}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onWeekChange={handleWeekChange}
                variant="compact"
              />
            </div>
          </div>

          <div className="order-2 lg:order-1 lg:col-span-12">
            {isStatsLoading ? (
              <BarberStatsCardsSkeleton />
            ) : (
              <BarberStatsCards
                todayCount={barberStats.todayCount}
                todayRevenue={barberStats.todayRevenue}
                weekCount={barberStats.weekCount}
                weekRevenue={barberStats.weekRevenue}
                hideValues={hideValues}
              />
            )}
          </div>

          <div className="order-3 lg:col-span-8">
            <div className="pt-2 lg:min-h-[500px] lg:rounded-2xl lg:border lg:border-border/70 lg:bg-card/30 lg:p-6 lg:pt-6">
              <h2 className="mb-4 hidden text-lg font-semibold text-foreground lg:block">
                Agenda do dia
              </h2>
              {isScheduleLoading ? (
                <DailyScheduleSkeleton />
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
