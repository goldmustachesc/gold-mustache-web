"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildTimeSelectionFeedback } from "@/lib/booking/time-selection-feedback";
import { cn } from "@/lib/utils";
import { TimeSelectionFeedbackPanel } from "@/components/booking/TimeSelectionFeedbackPanel";
import { Clock } from "lucide-react";
import type { BookingAvailability, TimeSlot } from "@/types/booking";
import {
  BOOKING_START_TIME_STEP_MINUTES,
  roundTimeUpToSlotBoundary,
} from "@/utils/time-slots";

interface TimeSlotGridProps {
  availability: BookingAvailability | null;
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

export function TimeSlotGrid({
  availability,
  selectedSlot,
  onSelect,
  isLoading,
}: TimeSlotGridProps) {
  const [selectedTime, setSelectedTime] = useState(
    selectedSlot?.time ?? availability?.windows[0]?.startTime ?? "",
  );

  const feedback = useMemo(() => {
    if (!availability || !selectedTime) {
      return null;
    }

    return buildTimeSelectionFeedback({
      windows: availability.windows,
      selectedStartTime: selectedTime,
      serviceDurationMinutes: availability.serviceDuration,
    });
  }, [availability, selectedTime]);

  const selectedTimeError =
    feedback && feedback.status !== "valid" ? feedback.message : null;

  useEffect(() => {
    setSelectedTime(
      selectedSlot?.time ?? availability?.windows[0]?.startTime ?? "",
    );
  }, [availability, selectedSlot]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-10 bg-muted rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if ((availability?.windows.length ?? 0) === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">
          Nenhuma janela disponível para esta data.
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Tente selecionar outro dia.
        </p>
      </div>
    );
  }

  const windows = availability?.windows ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Janelas disponíveis ({windows.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {windows.map((window) => (
            <span
              key={`${window.startTime}-${window.endTime}`}
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium"
            >
              {window.startTime} - {window.endTime}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="booking-exact-time">Escolha o início exato</Label>
          <Input
            id="booking-exact-time"
            aria-label="Escolha o início exato"
            type="time"
            step={BOOKING_START_TIME_STEP_MINUTES * 60}
            value={selectedTime}
            onChange={(event) =>
              setSelectedTime(
                roundTimeUpToSlotBoundary(event.target.value) ?? "",
              )
            }
            className={cn(
              "font-mono min-w-0 max-w-full appearance-none",
              selectedTimeError &&
                "border-destructive focus-visible:ring-destructive/30",
            )}
          />
          <p className="text-xs text-muted-foreground">
            Use intervalos de {BOOKING_START_TIME_STEP_MINUTES} minutos dentro
            das janelas acima.
          </p>
        </div>

        {feedback && (
          <TimeSelectionFeedbackPanel
            feedback={feedback}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
            className="rounded-md"
          />
        )}

        <Button
          type="button"
          className="w-full"
          disabled={!selectedTime || feedback?.status !== "valid"}
          onClick={() =>
            onSelect({
              time: selectedTime,
              available: true,
              barberId: availability?.barberId,
            })
          }
        >
          {feedback?.status === "valid" && feedback.selectedEndTime
            ? `Confirmar ${selectedTime} - ${feedback.selectedEndTime}`
            : "Confirmar horário"}
        </Button>
      </div>
    </div>
  );
}
