"use client";

import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/types/booking";
import { Clock } from "lucide-react";

interface ChatTimeSlotSelectorProps {
  slots: TimeSlot[];
  onSelect: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

export function ChatTimeSlotSelector({
  slots,
  onSelect,
  isLoading,
}: ChatTimeSlotSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 w-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  if (availableSlots.length === 0) {
    return (
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Nenhum horário disponível para esta data. Tente outro dia.
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
