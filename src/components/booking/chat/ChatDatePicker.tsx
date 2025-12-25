"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBrazilToday } from "@/hooks/useBrazilToday";

interface ChatDatePickerProps {
  onSelect: (date: Date) => void;
  disabledDates?: Date[];
  maxDays?: number;
}

const WEEKDAYS = [
  { key: "dom", label: "D" },
  { key: "seg", label: "S" },
  { key: "ter", label: "T" },
  { key: "qua", label: "Q" },
  { key: "qui", label: "Q" },
  { key: "sex", label: "S" },
  { key: "sab", label: "S" },
];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function ChatDatePicker({
  onSelect,
  disabledDates = [],
  maxDays = 30,
}: ChatDatePickerProps) {
  const today = useBrazilToday();

  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentMonth((prev) => (prev < minMonth ? minMonth : prev));
  }, [today]);

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxDays);
    return d;
  }, [today, maxDays]);

  const isDateDisabled = (date: Date) => {
    if (date < today) return true;
    if (date > maxDate) return true;
    return disabledDates.some((d) => d.toDateString() === date.toDateString());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const canGoPrev =
    currentMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext =
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) <=
    maxDate;

  const goToPrevMonth = () => {
    if (canGoPrev) {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
      );
    }
  };

  const goToNextMonth = () => {
    if (canGoNext) {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
      );
    }
  };

  return (
    <div className="bg-background border-2 border-muted rounded-xl p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToPrevMonth}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToNextMonth}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
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
            // biome-ignore lint/suspicious/noArrayIndexKey: empty slots have stable positions in the calendar grid
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isDisabled = isDateDisabled(date);
          const isToday = date.toDateString() === today.toDateString();

          return (
            <button
              type="button"
              key={date.toISOString()}
              onClick={() => !isDisabled && onSelect(date)}
              disabled={isDisabled}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg text-sm transition-all",
                isDisabled && "text-muted-foreground/30 cursor-not-allowed",
                !isDisabled &&
                  "hover:bg-primary hover:text-primary-foreground cursor-pointer active:scale-90",
                isToday && !isDisabled && "border-2 border-primary font-bold",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
