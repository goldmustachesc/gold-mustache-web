"use client";

import { AppointmentCard } from "@/components/booking/AppointmentCard";
import { isPastOrStarted } from "@/lib/booking/appointment-filters";
import type { AppointmentWithDetails } from "@/types/booking";
import { History } from "lucide-react";

interface AppointmentHistoryProps {
  appointments: AppointmentWithDetails[];
  feedbacksGiven: Set<string>;
  onOpenFeedback: (appointment: AppointmentWithDetails) => void;
}

export function AppointmentHistory({
  appointments,
  feedbacksGiven,
  onOpenFeedback,
}: AppointmentHistoryProps) {
  const count = appointments.length;

  return (
    <section className="pt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-muted-foreground">Histórico</h2>
          <p className="text-xs text-muted-foreground/70">
            {count} agendamento{count > 1 ? "s" : ""} anterior
            {count > 1 ? "es" : ""}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {appointments.map((appointment) => {
          const canReview =
            appointment.status === "COMPLETED" ||
            (appointment.status === "CONFIRMED" &&
              isPastOrStarted(appointment));

          return (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onFeedback={
                canReview ? () => onOpenFeedback(appointment) : undefined
              }
              hasFeedback={feedbacksGiven.has(appointment.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
