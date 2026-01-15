"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AppointmentWithDetails } from "@/types/booking";
import {
  Bell,
  Calendar,
  Clock,
  Loader2,
  MoreHorizontal,
  Phone,
  X,
} from "lucide-react";
import { formatDateDdMmYyyyInSaoPaulo } from "@/utils/datetime";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface DailyScheduleProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onCancelAppointment: (id: string, reason: string) => void;
  isCancelling?: boolean;
  cancellingId?: string | null;
  onMarkNoShow?: (id: string) => void;
  isMarkingNoShow?: boolean;
  markingNoShowId?: string | null;
  variant?: "default" | "compact";
  hideValues?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Barber chair icon for empty state (decorative)
function BarberChairIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 18v2a1 1 0 0 0 1 1h2" />
      <path d="M19 18v2a1 1 0 0 1-1 1h-2" />
      <path d="M5 18H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2" />
      <path d="M5 14v-3a7 7 0 0 1 14 0v3" />
      <path d="M7 8h10" />
      <rect x="7" y="14" width="10" height="4" rx="1" />
    </svg>
  );
}

export function DailySchedule({
  date,
  appointments,
  onCancelAppointment,
  isCancelling,
  cancellingId,
  onMarkNoShow,
  isMarkingNoShow,
  markingNoShowId,
  variant = "default",
  hideValues = false,
}: DailyScheduleProps) {
  const maskedValue = "R$ ***,**";
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(
    null,
  );

  const formatDate = (d: Date) => {
    return formatDateDdMmYyyyInSaoPaulo(d);
  };

  const handleSendReminder = async (appointmentId: string) => {
    setSendingReminderId(appointmentId);
    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(
        `${baseUrl}/api/appointments/${appointmentId}/reminder`,
        { method: "POST" },
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Erro ao enviar lembrete");
        return;
      }

      if (data.type === "notification_and_whatsapp" && data.whatsappUrl) {
        // Registered client: notification sent + open WhatsApp
        toast.success("Notificação enviada! Abrindo WhatsApp...");
        window.open(data.whatsappUrl, "_blank");
      } else if (data.type === "whatsapp" && data.whatsappUrl) {
        // Guest client: open WhatsApp
        window.open(data.whatsappUrl, "_blank");
        toast.success("WhatsApp aberto com mensagem de lembrete");
      } else if (data.type === "notification") {
        // Registered client without phone: notification only
        toast.success("Lembrete enviado para o cliente!");
      }
    } catch {
      toast.error("Erro ao enviar lembrete");
    } finally {
      setSendingReminderId(null);
    }
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

  const hours = Object.keys(appointmentsByHour).sort(
    (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
  );

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarberChairIcon className="h-16 w-16 text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg font-medium">Dia livre!</p>
            <p className="text-zinc-500 text-sm mt-1">
              Nenhum agendamento para este dia
            </p>
          </div>
        ) : (
          hours.map((hour) => (
            <div key={hour} className="space-y-2">
              {/* Hour marker */}
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <span>{hour}:00</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Appointments for this hour */}
              {appointmentsByHour[hour].map((appointment) => {
                const minutesUntil = getMinutesUntilAppointment(
                  appointment.date,
                  appointment.startTime,
                );
                const isConfirmed = appointment.status === "CONFIRMED";
                const isNoShow = appointment.status === "NO_SHOW";
                const isCancelled =
                  appointment.status === "CANCELLED_BY_CLIENT" ||
                  appointment.status === "CANCELLED_BY_BARBER";
                const isPast = minutesUntil <= 0;
                const canCancel = isConfirmed && !isPast;
                const canMarkNoShow = isConfirmed && isPast && !!onMarkNoShow;
                const canCallClient =
                  isNoShow && !!appointment.guestClient?.phone;
                const hasActions = canCancel || canMarkNoShow || canCallClient;

                return (
                  <div
                    key={appointment.id}
                    className={cn(
                      "relative overflow-hidden rounded-xl",
                      "bg-zinc-800/80",
                      isCancelled && "bg-red-950/30 border border-red-900/30",
                      isNoShow && "bg-amber-950/30 border border-amber-900/30",
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
                    {/* Status badge - top of card */}
                    {(isNoShow || isCancelled) && (
                      <div className="px-4 pt-3 pb-0">
                        <span
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-md inline-block",
                            isNoShow && "bg-amber-500/20 text-amber-400",
                            isCancelled && "bg-red-500/20 text-red-400",
                          )}
                        >
                          {isNoShow ? "Não compareceu" : "Cancelado"}
                        </span>
                      </div>
                    )}

                    {/* Top row: Time and actions */}
                    <div
                      className={cn(
                        "flex items-center justify-between px-4 pb-2",
                        isNoShow || isCancelled ? "pt-2" : "pt-3",
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm",
                          isCancelled
                            ? "text-zinc-500 line-through"
                            : "text-zinc-300",
                        )}
                      >
                        {appointment.startTime} - {appointment.endTime}
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Lembrete - só para agendamentos ativos */}
                        {isConfirmed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-amber-400 hover:bg-zinc-700"
                            onClick={() => handleSendReminder(appointment.id)}
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
                        {/* Menu de ações - só mostra se há ações disponíveis */}
                        {hasActions && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-zinc-900 border-zinc-700"
                            >
                              {canCancel && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const reason = prompt(
                                      "Motivo do cancelamento:",
                                    );
                                    if (reason) {
                                      onCancelAppointment(
                                        appointment.id,
                                        reason,
                                      );
                                    }
                                  }}
                                  disabled={
                                    isCancelling &&
                                    cancellingId === appointment.id
                                  }
                                  className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>
                              )}
                              {canMarkNoShow && (
                                <DropdownMenuItem
                                  onClick={() => onMarkNoShow?.(appointment.id)}
                                  disabled={
                                    isMarkingNoShow &&
                                    markingNoShowId === appointment.id
                                  }
                                  className="text-amber-400 focus:text-amber-400 focus:bg-amber-500/10"
                                >
                                  Marcar não compareceu
                                </DropdownMenuItem>
                              )}
                              {canCallClient && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`tel:${appointment.guestClient?.phone}`}
                                    className="flex items-center"
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

                    {/* Client name and service */}
                    <div className="px-4 pb-4 space-y-1">
                      <p
                        className={cn(
                          "text-lg font-semibold",
                          isCancelled ? "text-zinc-500" : "text-white",
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
                            isCancelled ? "text-zinc-600" : "text-zinc-400",
                          )}
                        >
                          {appointment.service.name}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isCancelled ? "text-zinc-500" : "text-zinc-300",
                          )}
                        >
                          {hideValues
                            ? maskedValue
                            : formatCurrency(Number(appointment.service.price))}
                        </p>
                      </div>
                    </div>

                    {/* Background chair icon */}
                    <BarberChairIcon className="absolute -right-4 -bottom-4 h-20 w-20 text-white/5" />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  }

  // Default variant (original design)
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
                  {appointmentsByHour[hour].map((appointment) => {
                    const minutesUntil = getMinutesUntilAppointment(
                      appointment.date,
                      appointment.startTime,
                    );
                    const isConfirmed = appointment.status === "CONFIRMED";
                    const isNoShow = appointment.status === "NO_SHOW";
                    const isPast = minutesUntil <= 0;

                    return (
                      <div
                        key={appointment.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {appointment.client?.fullName ||
                                appointment.guestClient?.fullName ||
                                "Cliente"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {appointment.startTime} - {appointment.endTime} •{" "}
                              {appointment.service.name}
                            </p>
                            <p className="text-sm font-medium mt-1">
                              {hideValues
                                ? maskedValue
                                : formatCurrency(
                                    Number(appointment.service.price),
                                  )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {isConfirmed && !isPast && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const reason = prompt(
                                    "Motivo do cancelamento:",
                                  );
                                  if (reason) {
                                    onCancelAppointment(appointment.id, reason);
                                  }
                                }}
                                disabled={
                                  isCancelling &&
                                  cancellingId === appointment.id
                                }
                              >
                                Cancelar
                              </Button>
                            )}
                            {isConfirmed && isPast && onMarkNoShow && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onMarkNoShow(appointment.id)}
                                disabled={
                                  isMarkingNoShow &&
                                  markingNoShowId === appointment.id
                                }
                              >
                                Não compareceu
                              </Button>
                            )}
                            {isNoShow && appointment.guestClient?.phone && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={`tel:${appointment.guestClient.phone}`}
                                >
                                  <Phone className="h-4 w-4 mr-1" />
                                  Ligar
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
