"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppointmentWithDetails } from "@/types/booking";
import { Calendar, Clock, Scissors, User, X } from "lucide-react";
import { parseDateString } from "@/utils/time-slots";

// Status values matching Prisma enum
const AppointmentStatus = {
  CONFIRMED: "CONFIRMED",
  CANCELLED_BY_CLIENT: "CANCELLED_BY_CLIENT",
  CANCELLED_BY_BARBER: "CANCELLED_BY_BARBER",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
} as const;

type AppointmentStatusType =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];
import { cn } from "@/lib/utils";

interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onCancel?: () => void;
  isCancelling?: boolean;
  showClientInfo?: boolean;
}

const statusConfig: Record<
  AppointmentStatusType,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  CONFIRMED: { label: "Confirmado", variant: "default" },
  CANCELLED_BY_CLIENT: { label: "Cancelado", variant: "destructive" },
  CANCELLED_BY_BARBER: {
    label: "Cancelado pelo barbeiro",
    variant: "destructive",
  },
  COMPLETED: { label: "Concluído", variant: "secondary" },
  NO_SHOW: { label: "Não compareceu", variant: "outline" },
};

export function AppointmentCard({
  appointment,
  onCancel,
  isCancelling,
  showClientInfo = false,
}: AppointmentCardProps) {
  const formatDate = (dateStr: string) => {
    // Parse the date string correctly to avoid timezone issues
    // API returns ISO string like "2025-12-15T00:00:00.000Z"
    const date = parseDateString(dateStr.split("T")[0]);
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const canCancel = appointment.status === AppointmentStatus.CONFIRMED;
  const status = statusConfig[appointment.status as AppointmentStatusType];

  return (
    <Card
      className={cn(
        "transition-all",
        appointment.status !== AppointmentStatus.CONFIRMED && "opacity-70",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{appointment.service.name}</h3>
              <p className="text-sm text-muted-foreground">
                {appointment.service.duration} min • R${" "}
                {appointment.service.price.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="capitalize">{formatDate(appointment.date)}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {appointment.startTime} - {appointment.endTime}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>
            {showClientInfo
              ? (appointment.client?.fullName ??
                appointment.guestClient?.fullName ??
                "Cliente")
              : appointment.barber.name}
          </span>
        </div>

        {appointment.cancelReason && (
          <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
            <strong>Motivo:</strong> {appointment.cancelReason}
          </div>
        )}
      </CardContent>

      {canCancel && onCancel && (
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 mr-2" />
            {isCancelling ? "Cancelando..." : "Cancelar Agendamento"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
