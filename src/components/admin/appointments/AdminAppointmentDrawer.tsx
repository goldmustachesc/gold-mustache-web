"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppointmentAdminItem } from "@/services/admin/appointments";
import { AdminCancelAppointmentDialog } from "./AdminCancelAppointmentDialog";
import { AdminRescheduleDialog } from "./AdminRescheduleDialog";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  CANCELLED_BY_CLIENT: "Cancelado pelo cliente",
  CANCELLED_BY_BARBER: "Cancelado pelo barbeiro",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
};

interface Props {
  appointment: AppointmentAdminItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: () => void;
}

export function AdminAppointmentDrawer({
  appointment,
  open,
  onOpenChange,
  onActionComplete,
}: Props) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  if (!appointment) return null;

  const clientName =
    appointment.client?.fullName ?? appointment.guestClient?.fullName ?? "—";
  const clientPhone =
    appointment.client?.phone ?? appointment.guestClient?.phone ?? "—";
  const isCancellable = appointment.status === "CONFIRMED";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle>Detalhes do agendamento</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4 text-sm">
            <Row label="Status">
              <Badge variant="outline">
                {STATUS_LABELS[appointment.status] ?? appointment.status}
              </Badge>
            </Row>
            <Row label="Data">{appointment.date}</Row>
            <Row label="Horário">
              {appointment.startTime} – {appointment.endTime}
            </Row>
            <Row label="Barbeiro">{appointment.barber?.name ?? "—"}</Row>
            <Row label="Serviço">{appointment.service?.name ?? "—"}</Row>
            <Row label="Cliente">{clientName}</Row>
            <Row label="Telefone">{clientPhone}</Row>
            {appointment.cancelReason && (
              <Row label="Motivo de cancelamento">
                {appointment.cancelReason}
              </Row>
            )}
          </div>

          {isCancellable && (
            <div className="mt-8 flex flex-col gap-2">
              <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
                Reagendar
              </Button>
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancelar agendamento
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {isCancellable && (
        <>
          <AdminCancelAppointmentDialog
            appointment={appointment}
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            onSuccess={() => {
              onOpenChange(false);
              onActionComplete();
            }}
          />
          <AdminRescheduleDialog
            appointment={appointment}
            open={rescheduleOpen}
            onOpenChange={setRescheduleOpen}
            onSuccess={() => {
              onOpenChange(false);
              onActionComplete();
            }}
          />
        </>
      )}
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
