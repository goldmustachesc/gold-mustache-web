"use client";

import type { CalendarSlot } from "@/services/admin/appointments";
import type { AppointmentAdminItem } from "@/services/admin/appointments";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED_BY_CLIENT: "Cancelado",
  CANCELLED_BY_BARBER: "Cancelado",
  NO_SHOW: "Não compareceu",
};

interface Props {
  slot: CalendarSlot;
  date: string;
  onFreeSlotClick: (barberId: string, date: string, time: string) => void;
  onOccupiedSlotClick: (appointment: AppointmentAdminItem) => void;
}

export function AdminCalendarSlot({
  slot,
  date,
  onFreeSlotClick,
  onOccupiedSlotClick,
}: Props) {
  if (slot.blocked) {
    return (
      <div
        className="h-10 rounded bg-muted/50 border border-dashed border-muted-foreground/20 flex items-center justify-center"
        title={slot.blockedReason ?? "Bloqueado"}
      >
        <span className="text-xs text-muted-foreground truncate px-1">
          {slot.blockedReason ?? "Bloqueado"}
        </span>
      </div>
    );
  }

  if (slot.appointment) {
    const apt = slot.appointment;
    const label =
      apt.client?.fullName ??
      apt.guestClient?.fullName ??
      apt.service?.name ??
      "Ocupado";
    return (
      <button
        type="button"
        className="h-10 w-full rounded bg-primary/10 border border-primary/30 text-xs text-left px-2 hover:bg-primary/20 transition-colors truncate"
        onClick={() => onOccupiedSlotClick(apt)}
        title={`${label} — ${STATUS_LABELS[apt.status] ?? apt.status}`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="h-10 w-full rounded border border-transparent hover:border-border hover:bg-accent transition-colors"
      onClick={() => onFreeSlotClick(slot.barberId, date, slot.time)}
      aria-label={`Slot livre ${slot.time}`}
    />
  );
}
