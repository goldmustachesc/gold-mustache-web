"use client";

import { Button } from "@/components/ui/button";
import type { TimeSlot } from "@/types/booking";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

export function TimeSlotGrid({
  slots,
  selectedSlot,
  onSelect,
  isLoading,
}: TimeSlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-10 bg-muted rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">
          Nenhum horário disponível para esta data.
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Tente selecionar outro dia.
        </p>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);
  const unavailableSlots = slots.filter((s) => !s.available);

  return (
    <div className="space-y-4">
      {availableSlots.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Horários disponíveis ({availableSlots.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {availableSlots.map((slot) => (
              <Button
                key={slot.time}
                variant={
                  selectedSlot?.time === slot.time ? "default" : "outline"
                }
                size="sm"
                onClick={() => onSelect(slot)}
                className={cn(
                  "font-mono",
                  selectedSlot?.time === slot.time && "ring-2 ring-primary/20",
                )}
              >
                {slot.time}
              </Button>
            ))}
          </div>
        </div>
      )}

      {unavailableSlots.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground/70 mb-3">
            Horários ocupados ({unavailableSlots.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {unavailableSlots.map((slot) => (
              <Button
                key={slot.time}
                variant="ghost"
                size="sm"
                disabled
                className="font-mono opacity-40 line-through"
              >
                {slot.time}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
