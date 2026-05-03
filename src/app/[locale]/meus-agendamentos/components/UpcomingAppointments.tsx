"use client";

import { AppointmentCard } from "@/components/booking/AppointmentCard";
import type { AppointmentWithDetails } from "@/types/booking";
import {
  formatLocalizedDateFromIsoDateLike,
  getRelativeDateLabel,
} from "@/utils/datetime";
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

function formatGroupDate(isoDate: string): string {
  return formatLocalizedDateFromIsoDateLike(isoDate, "pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  });
}

export function UpcomingAppointments({
  appointments,
  cancellingId,
  onCancel,
  getCancellationStatus,
}: UpcomingAppointmentsProps) {
  const count = appointments.length;

  const grouped = appointments.reduce<Record<string, AppointmentWithDetails[]>>(
    (acc, apt) => {
      const key = apt.date.split("T")[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(apt);
      return acc;
    },
    {},
  );
  const sortedDates = Object.keys(grouped).sort();

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

      <div className="space-y-6">
        {sortedDates.map((dateKey) => {
          const relative = getRelativeDateLabel(dateKey);
          const dateLabel = formatGroupDate(dateKey);

          return (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                {relative && (
                  <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                    {relative}
                  </span>
                )}
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <div className="space-y-3">
                {grouped[dateKey].map((appointment) => {
                  const { canCancel, isBlocked } =
                    getCancellationStatus(appointment);
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
          );
        })}
      </div>
    </section>
  );
}
