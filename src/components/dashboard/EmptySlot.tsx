"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BarberChairIcon } from "./BarberChairIcon";

export interface EmptySlotProps {
  time: string;
  endTime: string;
  isBlockedByAbsence: boolean;
  absenceReason: string | null;
  onOpenSheet?: (startTime: string, endTime: string) => void;
}

export function EmptySlot({
  time,
  endTime,
  isBlockedByAbsence,
  absenceReason,
  onOpenSheet,
}: EmptySlotProps) {
  const hasAction = !isBlockedByAbsence && Boolean(onOpenSheet);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl px-4 py-3 border",
        isBlockedByAbsence
          ? "bg-warning/10 border-warning/30"
          : "bg-card/30 border-dashed border-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span
            className={cn(
              "font-mono tabular-nums text-sm font-medium",
              isBlockedByAbsence ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {time} - {endTime}
          </span>
          <p
            className={cn(
              "text-xs mt-0.5",
              isBlockedByAbsence
                ? "text-muted-foreground"
                : "text-muted-foreground/70",
            )}
          >
            {isBlockedByAbsence ? "Bloqueado por ausência" : "Disponível"}
          </p>
          {isBlockedByAbsence && absenceReason && (
            <p className="text-xs mt-1 text-foreground/80">{absenceReason}</p>
          )}
        </div>

        {hasAction && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenSheet?.(time, endTime)}
            className="shrink-0 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            Adicionar
          </Button>
        )}
      </div>

      <BarberChairIcon
        className={cn(
          "absolute -right-2 -bottom-2 h-12 w-12",
          isBlockedByAbsence ? "text-amber-200/10" : "text-white/[0.02]",
        )}
      />
    </div>
  );
}
