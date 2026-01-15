"use client";

import { Button } from "@/components/ui/button";
import type { AppointmentWithDetails } from "@/types/booking";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateToString } from "@/utils/time-slots";

interface WeeklyCalendarProps {
  weekStart: Date;
  appointments: AppointmentWithDetails[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange: (direction: "prev" | "next") => void;
  variant?: "default" | "compact";
}

const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function formatWeekRangeCompact(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (d: Date) => {
    const day = d.getDate().toString().padStart(2, "0");
    const month = d
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "");
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return `${formatDate(weekStart)} à ${formatDate(weekEnd)}`;
}

export function WeeklyCalendar({
  weekStart,
  appointments,
  selectedDate,
  onDateSelect,
  onWeekChange,
  variant = "default",
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

  const todayStr = formatDateToString(new Date());
  const selectedDateStr = formatDateToString(selectedDate);

  if (variant === "compact") {
    return (
      <div className="space-y-4">
        {/* Week Range Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <CalendarDays className="h-5 w-5" />
            <span className="text-lg font-medium text-foreground">
              {formatWeekRangeCompact(weekStart)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onWeekChange("prev")}
              className="h-8 w-8 text-zinc-400 hover:text-foreground hover:bg-zinc-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onWeekChange("next")}
              className="h-8 w-8 text-zinc-400 hover:text-foreground hover:bg-zinc-800"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Weekday Pills */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((date, index) => {
            const dateStr = formatDateToString(date);
            const hasAppointments = daysWithAppointments.has(dateStr);
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === todayStr;

            return (
              <button
                type="button"
                key={dateStr}
                onClick={() => onDateSelect(date)}
                className={cn(
                  "flex flex-col items-center py-2 px-1 rounded-xl transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-amber-500/50",
                  isSelected
                    ? "bg-zinc-700 text-white"
                    : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-wide",
                    isSelected ? "text-amber-400" : "text-zinc-500",
                  )}
                >
                  {WEEKDAYS_SHORT[index]}
                </span>
                <span
                  className={cn(
                    "text-lg font-bold mt-0.5",
                    isSelected ? "text-white" : "text-zinc-300",
                    isToday && !isSelected && "text-amber-400",
                  )}
                >
                  {date.getDate().toString().padStart(2, "0")}
                </span>
                {/* Green indicator dot */}
                <div className="h-2 mt-1">
                  {hasAppointments && (
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isSelected ? "bg-emerald-400" : "bg-emerald-500",
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
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold capitalize">
          {formatWeekRange()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onWeekChange("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, index) => {
          const dateStr = formatDateToString(date);
          const count = appointmentCounts[dateStr] || 0;
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
