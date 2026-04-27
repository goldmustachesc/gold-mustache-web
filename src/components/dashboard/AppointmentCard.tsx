"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppointmentWithDetails } from "@/types/booking";
import {
  Bell,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Phone,
  X,
} from "lucide-react";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarberChairIcon } from "./BarberChairIcon";
import { getDashboardAppointmentStatusUi } from "@/components/barber/appointment-status-ui";
import { AppointmentCancelSheet } from "./AppointmentCancelSheet";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onOpenDetail: (appointment: AppointmentWithDetails) => void;
  onSendReminder: (appointmentId: string) => void;
  sendingReminderId: string | null;
  onCancelAppointment: (
    id: string,
    reason: string,
  ) => boolean | Promise<boolean>;
  isCancelling?: boolean;
  cancellingId?: string | null;
  onMarkNoShow?: (id: string) => void;
  isMarkingNoShow?: boolean;
  markingNoShowId?: string | null;
  onMarkComplete?: (id: string) => void;
  isMarkingComplete?: boolean;
  markingCompleteId?: string | null;
  hideValues: boolean;
  maskedValue: string;
  /** Relógio do cockpit; omite para usar o instante atual. */
  operationalNow?: Date;
}

export const AppointmentCard = memo(function AppointmentCard({
  appointment,
  onOpenDetail,
  onSendReminder,
  sendingReminderId,
  onCancelAppointment,
  isCancelling,
  cancellingId,
  onMarkNoShow,
  isMarkingNoShow,
  markingNoShowId,
  onMarkComplete,
  isMarkingComplete,
  markingCompleteId,
  hideValues,
  maskedValue,
  operationalNow,
}: AppointmentCardProps) {
  const completedUi = getDashboardAppointmentStatusUi("COMPLETED");
  const noShowUi = getDashboardAppointmentStatusUi("NO_SHOW");
  const minutesUntil = getMinutesUntilAppointment(
    appointment.date,
    appointment.startTime,
    operationalNow,
  );
  const isConfirmed = appointment.status === "CONFIRMED";
  const isNoShow = appointment.status === "NO_SHOW";
  const isCancelled =
    appointment.status === "CANCELLED_BY_CLIENT" ||
    appointment.status === "CANCELLED_BY_BARBER";
  const statusUi = getDashboardAppointmentStatusUi(appointment.status);
  const isPast = minutesUntil <= 0;
  const canCancel = isConfirmed && !isPast;
  const canMarkNoShow = isConfirmed && isPast && !!onMarkNoShow;
  const canMarkComplete = isConfirmed && isPast && !!onMarkComplete;
  const canCallClient = isNoShow && !!appointment.guestClient?.phone;
  const hasActions =
    canCancel || canMarkNoShow || canMarkComplete || canCallClient;

  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const clientLabel =
    appointment.client?.fullName ||
    appointment.guestClient?.fullName ||
    "Cliente";

  return (
    // biome-ignore lint/a11y/useSemanticElements: Cannot use button as it would nest buttons (inner action buttons)
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(appointment)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail(appointment);
        }
      }}
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-card/80 cursor-pointer",
        "transition-all duration-200 hover:bg-card hover:scale-[1.01]",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
        statusUi?.surfaceClassName,
      )}
      style={{
        backgroundImage: isCancelled
          ? `repeating-linear-gradient(
              135deg,
              transparent,
              transparent 10px,
              rgba(239,68,68,0.03) 10px,
              rgba(239,68,68,0.03) 20px
            )`
          : `repeating-linear-gradient(
              135deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.02) 10px,
              rgba(255,255,255,0.02) 20px
            )`,
      }}
    >
      {statusUi && (
        <div className="px-4 pt-3 pb-0">
          <span
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-md inline-block border",
              statusUi.badgeClassName,
            )}
          >
            {statusUi.label}
          </span>
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-between px-4 pb-2",
          statusUi ? "pt-2" : "pt-3",
        )}
      >
        <span
          className={cn(
            "font-mono tabular-nums text-sm",
            isCancelled
              ? "text-muted-foreground line-through"
              : "text-foreground",
          )}
        >
          {appointment.startTime} - {appointment.endTime}
        </span>
        <div className="flex items-center gap-1">
          {isConfirmed && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                onSendReminder(appointment.id);
              }}
              disabled={sendingReminderId === appointment.id}
              title="Enviar lembrete ao cliente"
            >
              {sendingReminderId === appointment.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
            </Button>
          )}
          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border-border text-popover-foreground shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {canCancel && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setCancelSheetOpen(true);
                    }}
                    disabled={isCancelling && cancellingId === appointment.id}
                    className="text-red-600 dark:text-destructive focus:text-red-600 dark:focus:text-destructive focus:bg-red-500/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </DropdownMenuItem>
                )}
                {canMarkComplete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkComplete?.(appointment.id);
                    }}
                    disabled={
                      isMarkingComplete && markingCompleteId === appointment.id
                    }
                    className={completedUi?.actionClassName}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Concluir
                  </DropdownMenuItem>
                )}
                {canMarkNoShow && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkNoShow?.(appointment.id);
                    }}
                    disabled={
                      isMarkingNoShow && markingNoShowId === appointment.id
                    }
                    className={noShowUi?.actionClassName}
                  >
                    Marcar não compareceu
                  </DropdownMenuItem>
                )}
                {canCallClient && (
                  <DropdownMenuItem asChild>
                    <a
                      href={`tel:${appointment.guestClient?.phone}`}
                      className="flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Ligar para cliente
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-1">
        <p
          className={cn(
            "text-lg font-semibold",
            isCancelled ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {appointment.client?.fullName ||
            appointment.guestClient?.fullName ||
            "Cliente"}
        </p>
        <div className="flex items-center justify-between">
          <p
            className={cn(
              "text-sm uppercase tracking-wide",
              "text-muted-foreground",
            )}
          >
            {appointment.service.name}
          </p>
          <p
            className={cn(
              "text-sm font-medium",
              isCancelled ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {hideValues
              ? maskedValue
              : formatCurrency(Number(appointment.service.price))}
          </p>
        </div>
      </div>

      <BarberChairIcon className="absolute -right-4 -bottom-4 h-20 w-20 text-white/5" />

      <AppointmentCancelSheet
        open={cancelSheetOpen}
        onOpenChange={setCancelSheetOpen}
        contextLabel={clientLabel}
        isPending={Boolean(isCancelling && cancellingId === appointment.id)}
        onConfirm={(reason) => onCancelAppointment(appointment.id, reason)}
      />
    </div>
  );
});
