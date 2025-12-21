"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

interface DatePickerProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  disabledDates?: Date[];
  maxDays?: number;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
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

export function DatePicker({
  selectedDate,
  onSelect,
  disabledDates = [],
  maxDays = 30,
}: DatePickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxDays);
    return d;
  }, [today, maxDays]);

  const isDateDisabled = (date: Date) => {
    // Past dates
    if (date < today) return true;
    // Beyond max days
    if (date > maxDate) return true;
    // Explicitly disabled dates
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

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add all days of the month
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
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevMonth}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            // biome-ignore lint/suspicious/noArrayIndexKey: empty placeholder cells have no stable identity
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isDisabled = isDateDisabled(date);
          const isSelected =
            selectedDate?.toDateString() === date.toDateString();
          const isToday = date.toDateString() === today.toDateString();

          return (
            <button
              type="button"
              key={date.toISOString()}
              onClick={() => !isDisabled && onSelect(date)}
              disabled={isDisabled}
              className={cn(
                "aspect-square flex items-center justify-center rounded-md text-sm transition-colors",
                isDisabled && "text-muted-foreground/40 cursor-not-allowed",
                !isDisabled && "hover:bg-primary/10 cursor-pointer",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary",
                isToday && !isSelected && "border border-primary",
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
