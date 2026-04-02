"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { BookingAvailability, TimeSlot } from "@/types/booking";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isStartTimeWithinAvailabilityWindows } from "@/lib/booking/availability-windows";

interface ChatTimeSlotSelectorProps {
  availability: BookingAvailability | null;
  onSelect: (slot: TimeSlot) => void;
  onChooseAnotherDate?: () => void;
  isLoading?: boolean;
}

export function ChatTimeSlotSelector({
  availability,
  onSelect,
  onChooseAnotherDate,
  isLoading,
}: ChatTimeSlotSelectorProps) {
  const [countdown, setCountdown] = useState(5);
  const [selectedTime, setSelectedTime] = useState(
    availability?.windows[0]?.startTime ?? "",
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const windows = availability?.windows ?? [];
  const hasNoSlots = !isLoading && windows.length === 0;
  const selectedTimeError = useMemo(() => {
    if (!availability || !selectedTime) {
      return null;
    }

    const fitsAvailability = isStartTimeWithinAvailabilityWindows({
      windows: availability.windows,
      startTime: selectedTime,
      durationMinutes: availability.serviceDuration,
    });

    if (fitsAvailability) {
      return null;
    }

    return "Escolha um horário dentro das janelas disponíveis.";
  }, [availability, selectedTime]);

  useEffect(() => {
    setSelectedTime(availability?.windows[0]?.startTime ?? "");
  }, [availability]);

  // Auto-redirect countdown when no slots
  useEffect(() => {
    if (hasNoSlots && onChooseAnotherDate) {
      // Reset countdown
      setCountdown(5);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-redirect after 5 seconds
      timerRef.current = setTimeout(() => {
        onChooseAnotherDate();
      }, 5000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [hasNoSlots, onChooseAnotherDate]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="h-11 bg-zinc-200 dark:bg-zinc-800 rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (windows.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl p-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Nenhuma janela disponível para esta data.
        </div>
        {onChooseAnotherDate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onChooseAnotherDate}
            className="w-full gap-2 border-zinc-300 hover:bg-zinc-200/50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Calendar className="h-4 w-4" />
            Escolher outra data {countdown > 0 && `(${countdown}s)`}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Janelas livres
        </p>
        <div className="flex flex-wrap gap-2">
          {windows.map((window) => (
            <span
              key={`${window.startTime}-${window.endTime}`}
              className="rounded-full border border-zinc-300/60 bg-zinc-100/80 px-3 py-1 text-xs font-medium text-zinc-900 dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-100"
            >
              {window.startTime} - {window.endTime}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="chat-exact-time">Escolha o início exato</Label>
        <Input
          id="chat-exact-time"
          aria-label="Escolha o início exato"
          type="time"
          step={60}
          value={selectedTime}
          onChange={(event) => setSelectedTime(event.target.value)}
          className={cn(
            "bg-zinc-100/80 border-zinc-300/50 dark:bg-zinc-800/80 dark:border-zinc-700/50",
            selectedTimeError &&
              "border-destructive focus-visible:ring-destructive/30",
          )}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Você pode escolher qualquer minuto dentro das janelas acima.
        </p>
        {selectedTimeError && (
          <p className="text-sm text-destructive">{selectedTimeError}</p>
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={!selectedTime || selectedTimeError !== null}
        onClick={() =>
          onSelect({
            time: selectedTime,
            available: true,
            barberId: availability?.barberId,
          })
        }
      >
        Confirmar horário
      </Button>
    </div>
  );
}
