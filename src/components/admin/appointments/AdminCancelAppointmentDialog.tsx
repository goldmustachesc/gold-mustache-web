"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AppointmentAdminItem } from "@/services/admin/appointments";

interface Props {
  appointment: AppointmentAdminItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function isWithinTwoHours(date: string, startTime: string): boolean {
  const [h, m] = startTime.split(":").map(Number);
  const apptMs = new Date(
    `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
  ).getTime();
  return apptMs - Date.now() < 2 * 60 * 60 * 1000 && apptMs > Date.now();
}

export function AdminCancelAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const withinWindow = isWithinTwoHours(
    appointment.date,
    appointment.startTime,
  );

  async function handleConfirm() {
    if (reason.trim().length < 3) {
      setError("Motivo deve ter ao menos 3 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/appointments/${appointment.id}/cancel`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Erro ao cancelar agendamento.");
        return;
      }
      onOpenChange(false);
      setReason("");
      onSuccess();
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar agendamento</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento. O cliente será notificado.
          </DialogDescription>
        </DialogHeader>

        {withinWindow && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            Este agendamento está dentro da janela de 2 horas. O cancelamento
            será aplicado mesmo assim.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Motivo do cancelamento</Label>
          <Textarea
            id="cancel-reason"
            placeholder="Descreva o motivo..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {reason.length}/300
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || reason.trim().length < 3}
          >
            {loading ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
