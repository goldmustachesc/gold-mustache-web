"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentCard } from "@/components/booking/AppointmentCard";
import type { AppointmentWithDetails } from "@/types/booking";
import { Calendar, Clock } from "lucide-react";

interface DailyScheduleProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onCancelAppointment: (id: string, reason: string) => void;
  isCancelling?: boolean;
  cancellingId?: string | null;
}

export function DailySchedule({
  date,
  appointments,
  onCancelAppointment,
  isCancelling,
  cancellingId,
}: DailyScheduleProps) {
  const formatDate = (d: Date) => {
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Sort appointments by start time
  const sortedAppointments = [...appointments].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  // Group appointments by hour for timeline view
  const appointmentsByHour = sortedAppointments.reduce(
    (acc, apt) => {
      const hour = apt.startTime.split(":")[0];
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(apt);
      return acc;
    },
    {} as Record<string, AppointmentWithDetails[]>,
  );

  const hours = Object.keys(appointmentsByHour).sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="capitalize">{formatDate(date)}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {appointments.length === 0
            ? "Nenhum agendamento para este dia"
            : `${appointments.length} agendamento${appointments.length > 1 ? "s" : ""}`}
        </p>
      </CardHeader>

      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Dia livre!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {hours.map((hour) => (
              <div key={hour} className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-sm font-medium text-muted-foreground w-12">
                    {hour}:00
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="ml-14 space-y-3">
                  {appointmentsByHour[hour].map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      showClientInfo
                      onCancel={() => {
                        const reason = prompt("Motivo do cancelamento:");
                        if (reason) {
                          onCancelAppointment(appointment.id, reason);
                        }
                      }}
                      isCancelling={
                        isCancelling && cancellingId === appointment.id
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
