"use client";

import { Button } from "@/components/ui/button";
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
  Star,
  CheckCircle,
} from "lucide-react";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { cn } from "@/lib/utils";

const AppointmentStatus = {
  CONFIRMED: "CONFIRMED",
  CANCELLED_BY_CLIENT: "CANCELLED_BY_CLIENT",
  CANCELLED_BY_BARBER: "CANCELLED_BY_BARBER",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
} as const;

type AppointmentStatusType =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onCancel?: () => void;
  isCancelling?: boolean;
  showClientInfo?: boolean;
  canCancel?: boolean;
  isCancellationBlocked?: boolean;
  onMarkNoShow?: () => void;
  canMarkNoShow?: boolean;
  isMarkingNoShow?: boolean;
  showClientPhone?: boolean;
  onFeedback?: () => void;
  hasFeedback?: boolean;
}

const statusConfig: Record<
  AppointmentStatusType,
  {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    iconBgClass: string;
    barClass: string;
  }
> = {
  CONFIRMED: {
    label: "Confirmado",
    bgClass: "bg-success/10",
    textClass: "text-success",
    borderClass: "border-success/30",
    iconBgClass: "bg-success/15",
    barClass: "bg-success",
  },
  CANCELLED_BY_CLIENT: {
    label: "Cancelado",
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    borderClass: "border-destructive/30",
    iconBgClass: "bg-destructive/15",
    barClass: "bg-destructive",
  },
  CANCELLED_BY_BARBER: {
    label: "Cancelado pelo barbeiro",
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    borderClass: "border-destructive/30",
    iconBgClass: "bg-destructive/15",
    barClass: "bg-destructive",
  },
  COMPLETED: {
    label: "Concluído",
    bgClass: "bg-muted/40",
    textClass: "text-muted-foreground",
    borderClass: "border-border/50",
    iconBgClass: "bg-muted/50",
    barClass: "bg-muted-foreground/30",
  },
  NO_SHOW: {
    label: "Não compareceu",
    bgClass: "bg-warning/10",
    textClass: "text-warning",
    borderClass: "border-warning/30",
    iconBgClass: "bg-warning/15",
    barClass: "bg-warning",
  },
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
  onFeedback,
  hasFeedback = false,
}: AppointmentCardProps) {
  const isCancellable =
    (canCancel ?? appointment.status === AppointmentStatus.CONFIRMED) &&
    !isCancellationBlocked;
  const status = statusConfig[appointment.status as AppointmentStatusType];
  const isConfirmed = appointment.status === AppointmentStatus.CONFIRMED;
  const canReview = onFeedback && !hasFeedback;
  const clientPhone =
    appointment.client?.phone ?? appointment.guestClient?.phone;
  const hasActions =
    (isCancellable && onCancel) || (canMarkNoShow && onMarkNoShow) || canReview;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-200",
        "bg-card border",
        isConfirmed
          ? "border-border hover:border-primary/30"
          : "border-border/50 opacity-75",
      )}
    >
      <div
        className={cn("absolute top-0 left-0 w-1 bottom-0", status.barClass)}
      />

      <div className="pl-4 pr-5 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center",
                status.iconBgClass,
              )}
            >
              <Scissors className={cn("h-4.5 w-4.5", status.textClass)} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-[15px] truncate">
                {appointment.service.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm text-muted-foreground">
                  {appointment.service.duration} min
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-sm font-medium font-mono text-primary">
                  R$ {appointment.service.price.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>
          <Badge
            className={cn(
              "shrink-0 border font-medium text-xs",
              status.bgClass,
              status.textClass,
              status.borderClass,
            )}
          >
            {status.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted/50">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {formatDateDdMmYyyyFromIsoDateLike(appointment.date)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted/50">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground font-mono">
              {appointment.startTime} - {appointment.endTime}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted/50">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {showClientInfo ? (
              (appointment.client?.fullName ??
              appointment.guestClient?.fullName ??
              "Cliente")
            ) : (
              <>
                Com{" "}
                <span className="font-medium text-foreground">
                  {appointment.barber.name}
                </span>
              </>
            )}
          </span>
        </div>

        {showClientPhone && clientPhone && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted/50">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <a
              href={`tel:${clientPhone}`}
              className="text-sm text-info hover:underline font-mono"
            >
              {clientPhone}
            </a>
          </div>
        )}

        {appointment.cancelReason && (
          <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">
              <strong>Motivo:</strong> {appointment.cancelReason}
            </p>
          </div>
        )}

        {isCancellationBlocked && (
          <div className="p-2.5 bg-warning/10 border border-warning/20 rounded-md flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p className="text-sm text-warning">
              Cancelamento não permitido com menos de 2 horas de antecedência.
              Em caso de não comparecimento, será cobrada uma taxa.
            </p>
          </div>
        )}

        {hasFeedback && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-success/10 border border-success/20">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm text-success">Avaliação enviada</span>
          </div>
        )}

        {hasActions && (
          <div className="flex gap-2 pt-2 border-t border-border">
            {isCancellable && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isCancelling || isMarkingNoShow}
                className="flex-1 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
              >
                <X className="h-4 w-4 mr-2" />
                {isCancelling ? "Cancelando..." : "Cancelar Agendamento"}
              </Button>
            )}
            {canMarkNoShow && onMarkNoShow && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkNoShow}
                disabled={isCancelling || isMarkingNoShow}
                className="flex-1 text-warning hover:text-warning/90 hover:bg-warning/10"
              >
                <UserX className="h-4 w-4 mr-2" />
                {isMarkingNoShow ? "Marcando..." : "Não Compareceu"}
              </Button>
            )}
            {canReview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onFeedback}
                className="flex-1 text-primary hover:text-primary/90 hover:bg-primary/10"
              >
                <Star className="h-4 w-4 mr-2" />
                Avaliar Atendimento
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
