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
} from "lucide-react";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { cn } from "@/lib/utils";

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
    bgClass: string;
    textClass: string;
    borderClass: string;
    iconBgClass: string;
  }
> = {
  CONFIRMED: {
    label: "Confirmado",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    iconBgClass: "bg-emerald-500/20",
  },
  CANCELLED_BY_CLIENT: {
    label: "Cancelado",
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
    iconBgClass: "bg-red-500/20",
  },
  CANCELLED_BY_BARBER: {
    label: "Cancelado pelo barbeiro",
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
    iconBgClass: "bg-red-500/20",
  },
  COMPLETED: {
    label: "Concluído",
    bgClass: "bg-zinc-500/10",
    textClass: "text-zinc-400",
    borderClass: "border-zinc-500/30",
    iconBgClass: "bg-zinc-500/20",
  },
  NO_SHOW: {
    label: "Não compareceu",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    iconBgClass: "bg-amber-500/20",
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
}: AppointmentCardProps) {
  const formatDate = (dateStr: string) => {
    return formatDateDdMmYyyyFromIsoDateLike(dateStr);
  };

  // If cancellation is blocked, cannot cancel
  const isCancellable =
    (canCancel ?? appointment.status === AppointmentStatus.CONFIRMED) &&
    !isCancellationBlocked;
  const status = statusConfig[appointment.status as AppointmentStatusType];
  const isConfirmed = appointment.status === AppointmentStatus.CONFIRMED;

  // Get client phone for NO_SHOW display
  const clientPhone =
    appointment.client?.phone ?? appointment.guestClient?.phone;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl transition-all duration-200",
        "bg-zinc-800/50 border hover:bg-zinc-800/70",
        isConfirmed
          ? "border-zinc-700/50 hover:border-zinc-600/50"
          : "border-zinc-800/50 opacity-70",
      )}
    >
      {/* Status Indicator Bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isConfirmed
            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
            : appointment.status === AppointmentStatus.COMPLETED
              ? "bg-gradient-to-r from-zinc-500 to-zinc-400"
              : appointment.status === AppointmentStatus.NO_SHOW
                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                : "bg-gradient-to-r from-red-500 to-red-400",
        )}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center",
                status.iconBgClass,
              )}
            >
              <Scissors className={cn("h-5 w-5", status.textClass)} />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">
                {appointment.service.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-zinc-500">
                  {appointment.service.duration} min
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-sm font-medium text-amber-400">
                  R$ {appointment.service.price.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>
          <Badge
            className={cn(
              "shrink-0 border font-medium",
              status.bgClass,
              status.textClass,
              status.borderClass,
            )}
          >
            {status.label}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/50">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-300">
              {formatDate(appointment.date)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/50">
            <Clock className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-300">
              {appointment.startTime} - {appointment.endTime}
            </span>
          </div>
        </div>

        {/* Barber/Client Info */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/50 mb-4">
          <User className="h-4 w-4 text-zinc-500" />
          <span className="text-sm text-zinc-300">
            {showClientInfo ? (
              <>
                {appointment.client?.fullName ??
                  appointment.guestClient?.fullName ??
                  "Cliente"}
              </>
            ) : (
              <>
                Com{" "}
                <span className="font-medium text-zinc-100">
                  {appointment.barber.name}
                </span>
              </>
            )}
          </span>
        </div>

        {/* Client Phone (for NO_SHOW) */}
        {showClientPhone && clientPhone && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-900/50 mb-4">
            <Phone className="h-4 w-4 text-zinc-500" />
            <a
              href={`tel:${clientPhone}`}
              className="text-sm text-amber-400 hover:underline"
            >
              {clientPhone}
            </a>
          </div>
        )}

        {/* Cancel Reason */}
        {appointment.cancelReason && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            <p className="text-sm text-red-400">
              <strong>Motivo:</strong> {appointment.cancelReason}
            </p>
          </div>
        )}

        {/* Cancellation Blocked Warning */}
        {isCancellationBlocked && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 mb-4">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-400">
              Cancelamento não permitido com menos de 2 horas de antecedência.
              Em caso de não comparecimento, será cobrada uma taxa.
            </p>
          </div>
        )}

        {/* Actions */}
        {((isCancellable && onCancel) || (canMarkNoShow && onMarkNoShow)) && (
          <div className="flex gap-2 pt-2 border-t border-zinc-700/50">
            {isCancellable && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isCancelling || isMarkingNoShow}
                className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                className="flex-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                <UserX className="h-4 w-4 mr-2" />
                {isMarkingNoShow ? "Marcando..." : "Não Compareceu"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
