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
      <div className="flex flex-wrap gap-2 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 w-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Nenhum horário disponível para esta data.
        </div>
        {onChooseAnotherDate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onChooseAnotherDate}
            className="w-full gap-2"
          >
            <Calendar className="h-4 w-4" />
            Escolher outra data {countdown > 0 && `(${countdown}s)`}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableSlots.map((slot) => (
        <button
          key={slot.time}
          type="button"
          onClick={() => onSelect(slot)}
          className={cn(
            "px-4 py-2.5 rounded-lg font-mono text-sm",
            "bg-background border-2 border-muted",
            "hover:border-primary hover:bg-primary/5",
            "transition-all duration-200",
            "active:scale-95",
          )}
        >
          {slot.time}
        </button>
      ))}
    </div>
  );
}
