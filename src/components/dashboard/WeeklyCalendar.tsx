"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppointmentWithDetails } from "@/types/booking";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateToString } from "@/utils/time-slots";
import { formatDateDdMmYyyyInSaoPaulo } from "@/utils/datetime";

interface WeeklyCalendarProps {
  weekStart: Date;
  appointments: AppointmentWithDetails[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange: (direction: "prev" | "next") => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function WeeklyCalendar({
  weekStart,
  appointments,
  selectedDate,
  onDateSelect,
  onWeekChange,
}: WeeklyCalendarProps) {
  // Generate array of 7 days starting from weekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Count appointments per day
  // apt.date already comes as "YYYY-MM-DD" string from API
  const appointmentCounts = weekDays.reduce(
    (acc, date) => {
      const dateStr = formatDateToString(date);
      acc[dateStr] = appointments.filter((apt) => apt.date === dateStr).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const todayStr = formatDateToString(new Date());
  const selectedDateStr = formatDateToString(selectedDate);

  const formatWeekRange = () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${formatDateDdMmYyyyInSaoPaulo(weekStart)} - ${formatDateDdMmYyyyInSaoPaulo(weekEnd)}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onWeekChange("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base capitalize">
            {formatWeekRange()}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onWeekChange("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
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
                <span className="text-xs font-medium">{WEEKDAYS[index]}</span>
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
      </CardContent>
    </Card>
  );
}
