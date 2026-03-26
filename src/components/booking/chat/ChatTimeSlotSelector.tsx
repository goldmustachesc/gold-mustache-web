"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/types/booking";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatTimeSlotSelectorProps {
  slots: TimeSlot[];
  onSelect: (slot: TimeSlot) => void;
  onChooseAnotherDate?: () => void;
  isLoading?: boolean;
}

export function ChatTimeSlotSelector({
  slots,
  onSelect,
  onChooseAnotherDate,
  isLoading,
}: ChatTimeSlotSelectorProps) {
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const availableSlots = slots.filter((s) => s.available);
  const hasNoSlots = !isLoading && availableSlots.length === 0;

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

  if (availableSlots.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl p-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Nenhum horário disponível para esta data.
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
    <div className="grid grid-cols-4 gap-2">
      {availableSlots.map((slot) => (
        <button
          key={slot.time}
          type="button"
          onClick={() => onSelect(slot)}
          className={cn(
            "px-3 py-2.5 rounded-lg font-mono text-sm",
            "bg-zinc-100/80 border border-zinc-300/50 dark:bg-zinc-800/80 dark:border-zinc-700/50",
            "hover:border-primary/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800",
            "transition-all duration-200",
            "active:scale-95",
            "text-zinc-900 dark:text-zinc-100",
          )}
        >
          {slot.time}
        </button>
      ))}
    </div>
  );
}
