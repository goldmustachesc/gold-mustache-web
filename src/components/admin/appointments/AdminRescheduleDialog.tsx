"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppointmentAdminItem } from "@/services/admin/appointments";

interface Props {
  appointment: AppointmentAdminItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminRescheduleDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [date, setDate] = useState(appointment.date);
  const [startTime, setStartTime] = useState(appointment.startTime);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDate(appointment.date);
      setStartTime(appointment.startTime);
      setError("");
    }
  }, [appointment.date, appointment.startTime, open]);

  const hasChanges =
    date !== appointment.date || startTime !== appointment.startTime;

  async function handleConfirm() {
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Erro ao reagendar agendamento.");
        return;
      }

      onOpenChange(false);
      onSuccess();
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reagendamento</DialogTitle>
          <DialogDescription>
            Ajuste data e horário do agendamento selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="reschedule-date">Data</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="reschedule-time">Horário</Label>
            <Input
              id="reschedule-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Voltar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !date || !startTime}
          >
            {loading ? "Reagendando..." : "Confirmar reagendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
