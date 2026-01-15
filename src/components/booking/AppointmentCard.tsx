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
import {
  Calendar,
  Clock,
  Scissors,
  User,
  X,
  AlertCircle,
  Phone,
  UserX,
} from "lucide-react";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";

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
  canCancel?: boolean;
  /** When true, shows a message that cancellation is blocked (within 2h window) */
  isCancellationBlocked?: boolean;
  /** Callback to mark appointment as NO_SHOW (barber only) */
  onMarkNoShow?: () => void;
  /** Whether the appointment can be marked as NO_SHOW */
  canMarkNoShow?: boolean;
  /** Whether NO_SHOW is being processed */
  isMarkingNoShow?: boolean;
  /** Whether to show the client phone (for NO_SHOW cases) */
  showClientPhone?: boolean;
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
  canCancel,
  isCancellationBlocked = false,
  onMarkNoShow,
  canMarkNoShow = false,
  isMarkingNoShow = false,
  showClientPhone = false,
}: AppointmentCardProps) {
  const formatDate = (dateStr: string) => {
    return formatDateDdMmYyyyFromIsoDateLike(dateStr);
  };

  // If cancellation is blocked, cannot cancel
  const isCancellable =
    (canCancel ?? appointment.status === AppointmentStatus.CONFIRMED) &&
    !isCancellationBlocked;
  const status = statusConfig[appointment.status as AppointmentStatusType];

  // Get client phone for NO_SHOW display
  const clientPhone =
    appointment.client?.phone ?? appointment.guestClient?.phone;

  return (
    <Card
      className={cn(
        "transition-all shadow-sm dark:bg-zinc-800/80 dark:border-zinc-700/50",
        appointment.status !== AppointmentStatus.CONFIRMED && "opacity-60",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground dark:text-zinc-100">
                {appointment.service.name}
              </h3>
              <p className="text-sm text-muted-foreground dark:text-zinc-500">
                {appointment.service.duration} min • R${" "}
                {appointment.service.price.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>
          <Badge
            variant={status.variant}
            className={cn(
              "shrink-0",
              status.variant === "default" &&
                "bg-primary/20 text-primary border-primary/30",
            )}
          >
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground dark:text-zinc-500" />
          <span className="text-foreground dark:text-zinc-300">
            {formatDate(appointment.date)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground dark:text-zinc-500" />
          <span className="text-foreground dark:text-zinc-300">
            {appointment.startTime} - {appointment.endTime}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <User className="h-4 w-4 text-muted-foreground dark:text-zinc-500" />
          <span className="text-foreground dark:text-zinc-300">
            {showClientInfo
              ? (appointment.client?.fullName ??
                appointment.guestClient?.fullName ??
                "Cliente")
              : appointment.barber.name}
          </span>
        </div>

        {showClientPhone && clientPhone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground dark:text-zinc-500" />
            <a
              href={`tel:${clientPhone}`}
              className="text-primary hover:underline"
            >
              {clientPhone}
            </a>
          </div>
        )}

        {appointment.cancelReason && (
          <div className="mt-2 p-2.5 bg-destructive/10 rounded-lg text-sm text-destructive">
            <strong>Motivo:</strong> {appointment.cancelReason}
          </div>
        )}

        {isCancellationBlocked && (
          <div className="mt-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Cancelamento não permitido com menos de 2 horas de antecedência.
              Em caso de não comparecimento, será cobrada uma taxa.
            </span>
          </div>
        )}
      </CardContent>

      {(isCancellable && onCancel) || (canMarkNoShow && onMarkNoShow) ? (
        <CardFooter className="pt-0 flex gap-2">
          {isCancellable && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isCancelling || isMarkingNoShow}
              className="flex-1 dark:border-zinc-700 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-2" />
              {isCancelling ? "Cancelando..." : "Cancelar"}
            </Button>
          )}
          {canMarkNoShow && onMarkNoShow && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkNoShow}
              disabled={isCancelling || isMarkingNoShow}
              className="flex-1 dark:border-zinc-700 text-amber-600 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-500 hover:bg-amber-500/10"
            >
              <UserX className="h-4 w-4 mr-2" />
              {isMarkingNoShow ? "Marcando..." : "Não Compareceu"}
            </Button>
          )}
        </CardFooter>
      ) : null}
    </Card>
  );
}
