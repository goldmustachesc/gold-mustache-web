"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import { formatDateToString } from "@/utils/time-slots";
import { useBrazilToday } from "@/hooks/useBrazilToday";
import {
  addDays,
  nextWeekday,
  getDaysInMonth,
  MONTHS,
  WEEKDAYS,
} from "@/utils/calendar";

interface DateSectionProps {
  selectedDate: string;
  disabledDates: Date[];
  dateAvailabilityLoading: boolean;
  calendarMaxDays: number;
  onSelect: (date: string) => void;
}

export function DateSection({
  selectedDate,
  disabledDates,
  dateAvailabilityLoading,
  calendarMaxDays,
  onSelect,
}: DateSectionProps) {
  const today = useBrazilToday();

  const maxDate = useMemo(
    () => addDays(today, calendarMaxDays),
    [today, calendarMaxDays],
  );

  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const selectedDateObj = useMemo(
    () =>
      selectedDate ? parseIsoDateYyyyMmDdAsSaoPauloDate(selectedDate) : null,
    [selectedDate],
  );

  const displayDate = selectedDate
    ? selectedDate.split("-").reverse().join("/")
    : null;

  const isDisabled = (date: Date) => {
    if (date < today || date > maxDate) return true;
    return disabledDates.some((d) => d.toDateString() === date.toDateString());
  };

  const canGoPrev =
    currentMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext =
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) <=
    maxDate;

  // Auto-advance if current month has no available dates
  useEffect(() => {
    let candidate = new Date(currentMonth);
    while (candidate <= maxDate) {
      const y = candidate.getFullYear();
      const m = candidate.getMonth();
      const daysCount = new Date(y, m + 1, 0).getDate();
      const hasAvailable = Array.from(
        { length: daysCount },
        (_, i) => new Date(y, m, i + 1),
      ).some((d) => {
        if (d < today || d > maxDate) return false;
        return !disabledDates.some(
          (dd) => dd.toDateString() === d.toDateString(),
        );
      });
      if (hasAvailable) break;
      candidate = new Date(y, m + 1, 1);
    }
    if (
      candidate.getFullYear() !== currentMonth.getFullYear() ||
      candidate.getMonth() !== currentMonth.getMonth()
    ) {
      setCurrentMonth(candidate);
    }
  }, [currentMonth, today, maxDate, disabledDates]);

  const days = getDaysInMonth(currentMonth);

  const quickDates = useMemo(
    () => [
      { id: "today", label: "Hoje", date: new Date(today) },
      { id: "tomorrow", label: "Amanhã", date: addDays(today, 1) },
      { id: "saturday", label: "Próximo sábado", date: nextWeekday(today, 6) },
      { id: "week", label: "Próxima semana", date: addDays(today, 7) },
    ],
    [today],
  );

  const handleSelect = (date: Date) => {
    if (!isDisabled(date)) onSelect(formatDateToString(date));
  };

  return (
    <div className="bg-muted/50 rounded-2xl p-6 border border-border">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Data</h2>
          <p className="text-xs text-muted-foreground">
            {dateAvailabilityLoading
              ? "Carregando disponibilidade..."
              : (displayDate ?? "Escolha a data")}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-background rounded-xl border border-border p-4 pb-2">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                  1,
                ),
              )
            }
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm text-foreground">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  1,
                ),
              )
            }
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day.key}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day.label}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              // biome-ignore lint/suspicious/noArrayIndexKey: stable empty grid positions
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const disabled = isDisabled(date);
            const isToday = date.toDateString() === today.toDateString();
            const isSelected =
              selectedDateObj != null &&
              date.toDateString() === selectedDateObj.toDateString();

            return (
              <button
                type="button"
                key={date.toISOString()}
                onClick={() => handleSelect(date)}
                disabled={disabled}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-lg text-sm transition-all",
                  disabled
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer active:scale-90",
                  isToday &&
                    !disabled &&
                    !isSelected &&
                    "ring-2 ring-primary font-bold",
                  isSelected && "bg-primary text-primary-foreground font-bold",
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Quick shortcuts */}
        <div className="mt-3 flex gap-2 overflow-x-auto border-t border-border pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickDates.map((shortcut) => (
            <Button
              key={shortcut.id}
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full"
              disabled={isDisabled(shortcut.date)}
              onClick={() => handleSelect(shortcut.date)}
            >
              {shortcut.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
