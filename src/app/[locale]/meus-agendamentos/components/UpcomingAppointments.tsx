"use client";

import { AppointmentCard } from "@/components/booking/AppointmentCard";
import type { AppointmentWithDetails } from "@/types/booking";
import { CalendarCheck } from "lucide-react";

interface UpcomingAppointmentsProps {
  appointments: AppointmentWithDetails[];
  cancellingId: string | null;
  onCancel: (appointmentId: string) => void;
  getCancellationStatus: (apt: AppointmentWithDetails) => {
    canCancel: boolean;
    isBlocked: boolean;
  };
}

export function UpcomingAppointments({
  appointments,
  cancellingId,
  onCancel,
  getCancellationStatus,
}: UpcomingAppointmentsProps) {
  const count = appointments.length;

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
          <CalendarCheck className="h-4 w-4 text-success" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">
            Próximos Agendamentos
          </h2>
          <p className="text-xs text-muted-foreground">
            {count} agendamento{count > 1 ? "s" : ""} confirmado
            {count > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="relative">
        {count > 1 && (
          <div
            data-testid="timeline-connector"
            className="absolute left-5 top-4 bottom-4 w-px bg-primary/20"
          />
        )}
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const { canCancel, isBlocked } = getCancellationStatus(appointment);
            return (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={() => onCancel(appointment.id)}
                isCancelling={cancellingId === appointment.id}
                canCancel={canCancel}
                isCancellationBlocked={isBlocked}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
