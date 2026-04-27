"use client";

import { Button } from "@/components/ui/button";
import type { AppointmentWithDetails } from "@/types/booking";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateToString } from "@/utils/time-slots";

interface WeeklyCalendarProps {
  weekStart: Date;
  appointments: AppointmentWithDetails[];
  absenceDates?: string[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange: (direction: "prev" | "next") => void;
  variant?: "default" | "compact";
  /** Relógio alinhado ao cockpit do dashboard; default `new Date()`. */
  operationalNow?: Date;
}

const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function formatWeekRangeCompact(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDayMonth = (d: Date) => {
    const day = d.getDate();
    const month = d
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
      .toLowerCase();
    return `${day} ${month}`;
  };

  return `${formatDayMonth(weekStart)} a ${formatDayMonth(weekEnd)}`;
}

export function WeeklyCalendar({
  weekStart,
  appointments,
  absenceDates = [],
  selectedDate,
  onDateSelect,
  onWeekChange,
  variant = "default",
  operationalNow,
}: WeeklyCalendarProps) {
  // Generate array of 7 days starting from weekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Check which days have appointments
  const daysWithAppointments = new Set(
    appointments
      .filter((apt) => apt.status === "CONFIRMED")
      .map((apt) => apt.date),
  );
  const daysWithAbsences = new Set(absenceDates);

  const todayStr = formatDateToString(operationalNow ?? new Date());
  const selectedDateStr = formatDateToString(selectedDate);

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        {/* Week Range Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <CalendarDays
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="truncate text-sm font-medium text-foreground">
              {formatWeekRangeCompact(weekStart)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onWeekChange("prev")}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onWeekChange("next")}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Próxima semana"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        </div>

        {/* Weekday Pills */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((date, index) => {
            const dateStr = formatDateToString(date);
            const hasAppointments = daysWithAppointments.has(dateStr);
            const hasAbsence = daysWithAbsences.has(dateStr);
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === todayStr;

            return (
              <button
                type="button"
                key={dateStr}
                onClick={() => onDateSelect(date)}
                className={cn(
                  "flex flex-col items-center rounded-xl px-0.5 py-2 transition-all min-h-[3.25rem]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isSelected
                    ? "bg-primary/10 text-foreground ring-2 ring-primary/60 ring-offset-2 ring-offset-background"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    isSelected ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {WEEKDAYS_SHORT[index]}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-base font-bold tabular-nums",
                    isSelected && "text-foreground",
                    !isSelected && isToday && "text-primary",
                    !isSelected && !isToday && "text-foreground/90",
                  )}
                >
                  {date.getDate().toString().padStart(2, "0")}
                </span>
                {/* Day indicators: appointments (green) and absences (amber) */}
                <div className="h-2 mt-1 flex items-center justify-center gap-1">
                  {hasAppointments && (
                    <span
                      data-testid="has-appointments-indicator"
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isSelected ? "bg-success" : "bg-success",
                      )}
                    />
                  )}
                  {hasAbsence && (
                    <span
                      data-testid="has-absence-indicator"
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isSelected ? "bg-warning/70" : "bg-warning",
                      )}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default variant (original design)
  const appointmentCounts = weekDays.reduce(
    (acc, date) => {
      const dateStr = formatDateToString(date);
      acc[dateStr] = appointments.filter((apt) => apt.date === dateStr).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const formatWeekRange = () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const format = (d: Date) =>
      d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    return `${format(weekStart)} - ${format(weekEnd)}`;
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between pb-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onWeekChange("prev")}
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <span className="text-base font-semibold capitalize">
          {formatWeekRange()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onWeekChange("next")}
          aria-label="Próxima semana"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, index) => {
          const dateStr = formatDateToString(date);
          const count = appointmentCounts[dateStr] || 0;
          const hasAbsence = daysWithAbsences.has(dateStr);
          const isSelected = dateStr === selectedDateStr;
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;

          return (
            <button
              type="button"
              key={dateStr}
              onClick={() => onDateSelect(date)}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg transition-colors",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday && "border border-primary",
                !isSelected && !isToday && "hover:bg-muted",
                isPast && !isSelected && "opacity-50",
              )}
            >
              <span className="text-xs font-medium">
                {WEEKDAYS_SHORT[index]}
              </span>
              <span className="text-lg font-bold">{date.getDate()}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full mt-1",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {count}
                </span>
              )}
              {hasAbsence && (
                <span
                  data-testid="has-absence-indicator"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mt-1",
                    isSelected ? "bg-warning/70" : "bg-warning",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
