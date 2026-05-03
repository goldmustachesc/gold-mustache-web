"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BookingAvailability, TimeSlot } from "@/types/booking";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartTimePicker } from "@/components/booking/SmartTimePicker";
import { buildSmartTimePickerModel } from "@/lib/booking/smart-time-picker";

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
  const [cancelled, setCancelled] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const windows = availability?.windows ?? [];
  const hasNoSlots = !isLoading && windows.length === 0;
  const pickerModel = useMemo(() => {
    if (!availability) {
      return null;
    }

    return buildSmartTimePickerModel({
      windows: availability.windows,
      serviceDurationMinutes: availability.serviceDuration,
    });
  }, [availability]);

  // Reset cancelled state when availability changes (new date selected)
  // biome-ignore lint/correctness/useExhaustiveDependencies: availability prop reference change signals a new date was picked
  useEffect(() => {
    setCancelled(false);
  }, [availability]);

  // Auto-redirect countdown when no slots
  useEffect(() => {
    if (cancelled) return;
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
  }, [hasNoSlots, onChooseAnotherDate, cancelled]);

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
    if (pickerModel) {
      return (
        <SmartTimePicker
          model={pickerModel}
          selectedStartTime={selectedTime}
          onSelectTime={setSelectedTime}
          onConfirm={() => undefined}
          onChooseAnotherDate={onChooseAnotherDate}
        />
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl p-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Nenhuma janela disponível para esta data.
        </div>
        {onChooseAnotherDate && (
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onChooseAnotherDate}
              className="flex-1 gap-2 border-zinc-300 hover:bg-zinc-200/50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Calendar className="h-4 w-4" />
              Escolher outra data{" "}
              {!cancelled && countdown > 0 && `(${countdown}s)`}
            </Button>
            {!cancelled && countdown > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCancelled(true);
                  if (timerRef.current) clearTimeout(timerRef.current);
                  if (countdownRef.current) clearInterval(countdownRef.current);
                }}
                className="shrink-0 text-muted-foreground"
              >
                Cancelar
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!pickerModel || !availability) {
    return null;
  }

  return (
    <SmartTimePicker
      model={pickerModel}
      selectedStartTime={selectedTime}
      onSelectTime={setSelectedTime}
      onChooseAnotherDate={onChooseAnotherDate}
      onConfirm={(time) =>
        onSelect({
          time,
          available: true,
          barberId: availability.barberId,
        })
      }
    />
  );
}
