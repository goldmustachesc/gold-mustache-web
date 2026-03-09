"use client";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarberChairIcon } from "./BarberChairIcon";

export interface EmptySlotProps {
  time: string;
  endTime: string;
  isBlockedByAbsence: boolean;
  absenceReason: string | null;
  onCreateAppointmentFromSlot?: (startTime: string) => void;
  onCreateAbsenceFromSlot?: (startTime: string, endTime: string) => void;
}

export function EmptySlot({
  time,
  endTime,
  isBlockedByAbsence,
  absenceReason,
  onCreateAppointmentFromSlot,
  onCreateAbsenceFromSlot,
}: EmptySlotProps) {
  const hasActions =
    !isBlockedByAbsence &&
    Boolean(onCreateAppointmentFromSlot) &&
    Boolean(onCreateAbsenceFromSlot);

  const slotContent = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl px-4 py-3 border",
        isBlockedByAbsence
          ? "bg-warning/10 border-warning/30"
          : "bg-card/30 border-dashed border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm",
            isBlockedByAbsence ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {time} - {endTime}
        </span>
        <span
          className={cn(
            "text-xs uppercase tracking-wide",
            isBlockedByAbsence
              ? "text-muted-foreground"
              : "text-muted-foreground",
          )}
        >
          {isBlockedByAbsence ? "Bloqueado por ausência" : "Disponível"}
        </span>
      </div>
      {isBlockedByAbsence && absenceReason && (
        <p className="text-xs mt-1 text-foreground/80">{absenceReason}</p>
      )}
      {!isBlockedByAbsence && hasActions && (
        <p className="text-xs text-muted-foreground mt-1">
          Toque para cadastrar atendimento ou ausência
        </p>
      )}
      <BarberChairIcon
        className={cn(
          "absolute -right-2 -bottom-2 h-12 w-12",
          isBlockedByAbsence ? "text-amber-200/10" : "text-white/[0.02]",
        )}
      />
    </div>
  );

  if (!hasActions) {
    return <div>{slotContent}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl"
          aria-label={`Ações para horário ${time}`}
        >
          {slotContent}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-popover border-border text-popover-foreground shadow-lg"
      >
        <DropdownMenuItem onClick={() => onCreateAppointmentFromSlot?.(time)}>
          Cadastrar atendimento às {time}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCreateAbsenceFromSlot?.(time, endTime)}
          className="text-warning dark:text-warning focus:text-warning dark:focus:text-warning focus:bg-warning/10"
        >
          Adicionar ausência neste horário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
