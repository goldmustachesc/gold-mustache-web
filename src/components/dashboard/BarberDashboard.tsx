"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BarberStatsCards } from "./BarberStatsCards";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { DailySchedule } from "./DailySchedule";
import { BarberDashboardHero } from "./BarberDashboardHero";
import { BarberDashboardDesktopSidebar } from "./BarberDashboardDesktopSidebar";
import { buildDailyOperationalModel } from "./buildDailyOperationalModel";
import {
  useBarberAppointments,
  useCancelAppointmentByBarber,
  useMarkNoShow,
  useMarkCompleted,
} from "@/hooks/useBooking";
import { useMyWorkingHours } from "@/hooks/useBarberWorkingHours";
import { useBarberAbsences } from "@/hooks/useBarberAbsences";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
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
  CalendarPlus,
  Users,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  formatDateToString,
  getBrazilDateString,
  parseDateString,
} from "@/utils/time-slots";
import {
  formatIsoDateYyyyMmDdInSaoPaulo,
  formatTimeHHmmInSaoPaulo,
} from "@/utils/datetime";
import Link from "next/link";
import { consolidateOperationalAppointments } from "@/lib/booking/operational-appointments";
import { QuickAction } from "./QuickAction";

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
    <div
      data-testid="stats-cards-loading"
      className="grid grid-cols-2 gap-2 sm:gap-3"
    >
      {[0, 1].map((index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card/60 p-3"
        >
          <div className="space-y-2 animate-pulse">
            <div className="h-3 w-16 rounded bg-muted/70" />
            <div className="h-3 w-20 rounded bg-muted/60" />
            <div className="h-8 w-12 rounded bg-muted/70" />
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

function DesktopSidebarSkeleton() {
  return (
    <div
      data-testid="barber-dashboard-desktop-sidebar-skeleton"
      className="rounded-2xl border border-border/70 bg-card/40 p-4"
    >
      <div className="animate-pulse space-y-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-muted/70" />
          <div className="h-5 w-36 rounded bg-muted/60" />
          <div className="h-4 w-full rounded bg-muted/50" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="rounded-xl border border-border/60 bg-background/70 p-3"
            >
              <div className="h-3 w-20 rounded bg-muted/60" />
              <div className="mt-3 h-7 w-16 rounded bg-muted/70" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-14 rounded-xl border border-border/60 bg-background/70"
            />
          ))}
        </div>
      </div>
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
  /** Atualiza ~1/min para o cockpit não congelar o “agora”. */
  const [operationalNowEpoch, setOperationalNowEpoch] = useState(() =>
    Date.now(),
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setOperationalNowEpoch(Date.now());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const operationalNow = useMemo(
    () => new Date(operationalNowEpoch),
    [operationalNowEpoch],
  );

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseDateString(getBrazilDateString()),
  );
  /** Semana civil “atual” acompanha o mesmo relógio do cockpit (`operationalNow`). */
  const currentWeekReferenceDate = useMemo(
    () => parseDateString(formatIsoDateYyyyMmDdInSaoPaulo(operationalNow)),
    [operationalNow],
  );
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStart(selectedDate),
  );
  const currentWeekStart = useMemo(
    () => getWeekStart(currentWeekReferenceDate),
    [currentWeekReferenceDate],
  );

  const barberId = barberProfile.id;
  useRealtimeAppointments(barberId);
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
  ): Promise<boolean> => {
    setCancellingId(appointmentId);
    try {
      await cancelAppointment.mutateAsync({ appointmentId, reason });
      toast.success("Agendamento cancelado com sucesso!");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar");
      return false;
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
  const weeklyOperationalAppointments = useMemo(
    () => consolidateOperationalAppointments(appointments),
    [appointments],
  );
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
    const todayStr = formatIsoDateYyyyMmDdInSaoPaulo(operationalNow);
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
  }, [statsAppointments, operationalNow]);
  const confirmedDailyOperationalAppointments = useMemo(
    () =>
      dailyAppointments.filter(
        (appointment) => appointment.status === "CONFIRMED",
      ),
    [dailyAppointments],
  );
  const confirmedWeeklyOperationalAppointments = useMemo(
    () =>
      weeklyOperationalAppointments.filter(
        (appointment) => appointment.status === "CONFIRMED",
      ),
    [weeklyOperationalAppointments],
  );
  const desktopSidebarMetrics = useMemo(
    () => ({
      dayRevenue: confirmedDailyOperationalAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.service.price),
        0,
      ),
      weekRevenue: confirmedWeeklyOperationalAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.service.price),
        0,
      ),
    }),
    [
      confirmedDailyOperationalAppointments,
      confirmedWeeklyOperationalAppointments,
    ],
  );
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

  const dashboardOperationalModel = useMemo(() => {
    return buildDailyOperationalModel({
      selectedDate: selectedDateStr,
      currentDate: formatIsoDateYyyyMmDdInSaoPaulo(operationalNow),
      currentTime: formatTimeHHmmInSaoPaulo(operationalNow),
      appointments: dailyAppointments,
      absences: selectedDateAbsences,
      workingHours: selectedDayWorkingHours,
    });
  }, [
    selectedDateStr,
    operationalNow,
    dailyAppointments,
    selectedDateAbsences,
    selectedDayWorkingHours,
  ]);

  const heroFocusedAppointment =
    dashboardOperationalModel.hero.appointmentId !== null
      ? (dailyAppointments.find(
          (a) => a.id === dashboardOperationalModel.hero.appointmentId,
        ) ?? null)
      : null;

  const viewingToday =
    selectedDateStr === formatIsoDateYyyyMmDdInSaoPaulo(operationalNow);

  const firstName = barberProfile.name.split(" ")[0] || "Barbeiro";

  usePrivateHeader({
    title: `Olá, ${firstName}`,
    icon: Calendar,
  });

  return (
    <div>
      <PrivateHeaderActions>
        {/* Desktop: CTAs completos */}
        <Link href={`/${locale}/barbeiro/agendar`} className="hidden lg:block">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-4 ipad:grid ipad:grid-cols-8 ipad:items-start ipad:gap-5 ipad:px-5 ipad:py-5 lg:grid lg:grid-cols-10 lg:items-start lg:gap-5 lg:px-6 lg:py-5 xl:grid-cols-12 xl:gap-6 xl:px-8 xl:py-6">
          <div className="space-y-4 ipad:col-span-5 lg:col-span-6 xl:col-span-8">
            {isScheduleLoading ? (
              <div
                className="h-36 animate-pulse rounded-2xl border border-border/60 bg-muted/30 ipad:h-44 lg:h-44 xl:h-48"
                data-testid="barber-dashboard-hero-skeleton"
                aria-hidden
              />
            ) : (
              <BarberDashboardHero
                hideValues={hideValues}
                hero={dashboardOperationalModel.hero}
                firstAvailableSlot={
                  dashboardOperationalModel.firstAvailableSlot
                }
                focusedAppointment={heroFocusedAppointment}
                locale={locale}
                selectedDateStr={selectedDateStr}
                viewingToday={viewingToday}
                hasConfiguredWorkingHours={
                  dashboardOperationalModel.hasConfiguredWorkingHours
                }
                absencesHref={absencesPageHref}
                onToggleHideValues={() => setHideValues((prev) => !prev)}
              />
            )}
            <div
              id="agenda-do-dia"
              className="scroll-mt-24 pt-2 ipad:min-h-[440px] ipad:rounded-2xl ipad:border ipad:border-border/80 ipad:bg-card/40 ipad:p-4 ipad:pt-4 ipad:dark:border-border/90 ipad:dark:bg-card/55 lg:min-h-[460px] lg:rounded-2xl lg:border lg:border-border/80 lg:bg-card/40 lg:p-5 lg:pt-5 lg:dark:border-border/90 lg:dark:bg-card/55 xl:min-h-[500px] xl:p-6 xl:pt-6"
            >
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Agenda do dia
              </h2>
              {isScheduleLoading ? (
                <DailyScheduleSkeleton />
              ) : (
                <DailySchedule
                  date={selectedDate}
                  operationalNow={operationalNow}
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

          <div className="ipad:col-span-3 lg:col-span-4 xl:row-span-2">
            <div className="space-y-4 ipad:sticky ipad:top-20 lg:sticky lg:top-20 xl:top-24">
              <div className="ipad:rounded-2xl ipad:border ipad:border-border/80 ipad:bg-card/60 ipad:p-3 ipad:dark:border-border/90 ipad:dark:bg-card/70 lg:rounded-2xl lg:border lg:border-border/80 lg:bg-card/60 lg:p-4 lg:dark:border-border/90 lg:dark:bg-card/70">
                <WeeklyCalendar
                  weekStart={weekStart}
                  appointments={calendarAppointments}
                  absenceDates={calendarAbsenceDates}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  onWeekChange={handleWeekChange}
                  variant="compact"
                  operationalNow={operationalNow}
                />
              </div>

              <div className="hidden ipad:block lg:block">
                {isScheduleLoading ? (
                  <DesktopSidebarSkeleton />
                ) : (
                  <BarberDashboardDesktopSidebar
                    locale={locale}
                    absencesPageHref={absencesPageHref}
                    dailyAppointmentsCount={dailyAppointments.length}
                    availableSlotCount={
                      dashboardOperationalModel.availableSlotCount
                    }
                    dayRevenue={desktopSidebarMetrics.dayRevenue}
                    weekRevenue={desktopSidebarMetrics.weekRevenue}
                    hideValues={hideValues}
                    hasPartialAbsences={
                      dashboardOperationalModel.hasPartialAbsences
                    }
                    hasFullDayAbsence={
                      dashboardOperationalModel.hasFullDayAbsence
                    }
                    isDayOff={dashboardOperationalModel.isDayOff}
                    hasConfiguredWorkingHours={
                      dashboardOperationalModel.hasConfiguredWorkingHours
                    }
                  />
                )}
              </div>
            </div>
          </div>

          <div
            data-testid="barber-dashboard-mobile-secondary"
            className="space-y-5 ipad:hidden lg:hidden"
          >
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

            <section
              data-testid="barber-dashboard-secondary"
              aria-labelledby="dashboard-quick-links-heading"
              className="rounded-2xl border border-border/60 bg-muted/20 p-3 lg:p-4"
            >
              <h2
                id="dashboard-quick-links-heading"
                className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Atalhos
              </h2>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
                <QuickAction
                  href={`/${locale}/barbeiro/agendar`}
                  label="Agendar cliente"
                  icon={
                    <CalendarPlus className="h-5 w-5 text-muted-foreground" />
                  }
                />
                <QuickAction
                  href={`/${locale}/barbeiro/clientes`}
                  label="Clientes"
                  icon={<Users className="h-5 w-5 text-muted-foreground" />}
                />
                <QuickAction
                  href={absencesPageHref}
                  label="Ausências"
                  icon={
                    <CalendarOff className="h-5 w-5 text-muted-foreground" />
                  }
                />
                <QuickAction
                  href={`/${locale}/barbeiro/horarios`}
                  label="Horários"
                  icon={<Clock className="h-5 w-5 text-muted-foreground" />}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
