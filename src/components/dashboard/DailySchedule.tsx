"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  AppointmentWithDetails,
  BarberWorkingHoursDay,
} from "@/types/booking";
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
import {
  getMinutesUntilAppointment,
  generateTimeSlots,
  parseTimeToMinutes,
  addMinutesToTime,
} from "@/utils/time-slots";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AppointmentDetailSheet } from "@/components/barber/AppointmentDetailSheet";

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
  workingHours?: BarberWorkingHoursDay | null;
}

// Slot duration in minutes for generating timeline
const SLOT_DURATION = 30;

// Represents a time slot in the schedule (either empty or with an appointment)
interface ScheduleSlot {
  time: string;
  endTime: string;
  appointment: AppointmentWithDetails | null;
  isAvailable: boolean;
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

// Extracted appointment card component for reuse
interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onOpenDetail: (appointment: AppointmentWithDetails) => void;
  onSendReminder: (appointmentId: string) => void;
  sendingReminderId: string | null;
  onCancelAppointment: (id: string, reason: string) => void;
  isCancelling?: boolean;
  cancellingId?: string | null;
  onMarkNoShow?: (id: string) => void;
  isMarkingNoShow?: boolean;
  markingNoShowId?: string | null;
  hideValues: boolean;
  maskedValue: string;
}

function AppointmentCard({
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
  hideValues,
  maskedValue,
}: AppointmentCardProps) {
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
  const canCallClient = isNoShow && !!appointment.guestClient?.phone;
  const hasActions = canCancel || canMarkNoShow || canCallClient;

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
        "bg-zinc-800/80 cursor-pointer",
        "transition-all duration-200 hover:bg-zinc-800 hover:scale-[1.01]",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-zinc-900",
        isCancelled &&
          "bg-red-950/30 border border-red-900/30 hover:bg-red-950/40",
        isNoShow &&
          "bg-amber-950/30 border border-amber-900/30 hover:bg-amber-950/40",
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
            isCancelled ? "text-zinc-500 line-through" : "text-zinc-300",
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
          {/* Menu de ações - só mostra se há ações disponíveis */}
          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-900 border-zinc-700"
                onClick={(e) => e.stopPropagation()}
              >
                {canCancel && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      const reason = prompt("Motivo do cancelamento:");
                      if (reason) {
                        onCancelAppointment(appointment.id, reason);
                      }
                    }}
                    disabled={isCancelling && cancellingId === appointment.id}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
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
  workingHours,
}: DailyScheduleProps) {
  const maskedValue = "R$ ***,**";
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(
    null,
  );
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Generate complete schedule with empty slots
  const scheduleSlots = useMemo((): ScheduleSlot[] => {
    // If no working hours or not working, return empty
    if (
      !workingHours ||
      !workingHours.isWorking ||
      !workingHours.startTime ||
      !workingHours.endTime
    ) {
      return [];
    }

    // Generate base time slots
    const baseSlots = generateTimeSlots({
      startTime: workingHours.startTime,
      endTime: workingHours.endTime,
      duration: SLOT_DURATION,
      breakStart: workingHours.breakStart,
      breakEnd: workingHours.breakEnd,
    });

    // Sort appointments by start time
    const sortedAppointments = [...appointments].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    // Create a map of appointment start times for quick lookup
    const appointmentMap = new Map<string, AppointmentWithDetails>();
    for (const apt of sortedAppointments) {
      appointmentMap.set(apt.startTime, apt);
    }

    // Build the schedule: merge slots with appointments
    const schedule: ScheduleSlot[] = [];
    let slotIndex = 0;

    while (slotIndex < baseSlots.length) {
      const slot = baseSlots[slotIndex];
      const slotMinutes = parseTimeToMinutes(slot.time);

      // Check if there's an appointment starting at this slot
      const appointment = appointmentMap.get(slot.time);

      if (appointment) {
        // This slot has an appointment
        schedule.push({
          time: appointment.startTime,
          endTime: appointment.endTime,
          appointment,
          isAvailable: false,
        });

        // Skip slots that are covered by this appointment's duration
        const appointmentEndMinutes = parseTimeToMinutes(appointment.endTime);
        while (
          slotIndex < baseSlots.length &&
          parseTimeToMinutes(baseSlots[slotIndex].time) < appointmentEndMinutes
        ) {
          slotIndex++;
        }
      } else {
        // Check if this slot is within any appointment's duration
        const overlappingAppointment = sortedAppointments.find((apt) => {
          const aptStart = parseTimeToMinutes(apt.startTime);
          const aptEnd = parseTimeToMinutes(apt.endTime);
          return slotMinutes >= aptStart && slotMinutes < aptEnd;
        });

        if (!overlappingAppointment) {
          // Empty slot
          schedule.push({
            time: slot.time,
            endTime: addMinutesToTime(slot.time, SLOT_DURATION),
            appointment: null,
            isAvailable: true,
          });
        }
        slotIndex++;
      }
    }

    return schedule;
  }, [workingHours, appointments]);

  const handleOpenAppointmentDetail = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setSheetOpen(true);
  };

  const handleCloseSheet = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      // Limpa o appointment selecionado após a animação de fechamento
      setTimeout(() => setSelectedAppointment(null), 300);
    }
  };

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
    // Check if it's a day off (not working)
    const isDayOff = workingHours && !workingHours.isWorking;

    // Group schedule slots by hour
    const slotsByHour = scheduleSlots.reduce(
      (acc, slot) => {
        const hour = slot.time.split(":")[0];
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(slot);
        return acc;
      },
      {} as Record<string, ScheduleSlot[]>,
    );

    const scheduleHours = Object.keys(slotsByHour).sort(
      (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
    );

    // Check if we should show the full schedule (has working hours)
    const hasWorkingHours = workingHours?.isWorking && scheduleSlots.length > 0;

    return (
      <div className="space-y-3">
        {isDayOff ? (
          // Day off state
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarberChairIcon className="h-16 w-16 text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg font-medium">Dia de folga</p>
            <p className="text-zinc-500 text-sm mt-1">
              Você não trabalha neste dia
            </p>
          </div>
        ) : !hasWorkingHours && appointments.length === 0 ? (
          // No working hours configured and no appointments
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarberChairIcon className="h-16 w-16 text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg font-medium">Dia livre!</p>
            <p className="text-zinc-500 text-sm mt-1">
              Nenhum agendamento para este dia
            </p>
          </div>
        ) : !hasWorkingHours ? (
          // Fallback: show only appointments (old behavior)
          hours.map((hour) => (
            <div key={hour} className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <span>{hour}:00</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              {appointmentsByHour[hour].map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onOpenDetail={handleOpenAppointmentDetail}
                  onSendReminder={handleSendReminder}
                  sendingReminderId={sendingReminderId}
                  onCancelAppointment={onCancelAppointment}
                  isCancelling={isCancelling}
                  cancellingId={cancellingId}
                  onMarkNoShow={onMarkNoShow}
                  isMarkingNoShow={isMarkingNoShow}
                  markingNoShowId={markingNoShowId}
                  hideValues={hideValues}
                  maskedValue={maskedValue}
                />
              ))}
            </div>
          ))
        ) : (
          // Full schedule with empty slots
          scheduleHours.map((hour) => (
            <div key={hour} className="space-y-2">
              {/* Hour marker */}
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <span>{hour}:00</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Slots for this hour */}
              {slotsByHour[hour].map((slot) => {
                if (slot.appointment) {
                  return (
                    <AppointmentCard
                      key={slot.appointment.id}
                      appointment={slot.appointment}
                      onOpenDetail={handleOpenAppointmentDetail}
                      onSendReminder={handleSendReminder}
                      sendingReminderId={sendingReminderId}
                      onCancelAppointment={onCancelAppointment}
                      isCancelling={isCancelling}
                      cancellingId={cancellingId}
                      onMarkNoShow={onMarkNoShow}
                      isMarkingNoShow={isMarkingNoShow}
                      markingNoShowId={markingNoShowId}
                      hideValues={hideValues}
                      maskedValue={maskedValue}
                    />
                  );
                }

                // Empty slot
                return (
                  <div
                    key={`empty-${slot.time}`}
                    className="relative overflow-hidden rounded-xl bg-zinc-800/30 border border-dashed border-zinc-700/50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">
                        {slot.time} - {slot.endTime}
                      </span>
                      <span className="text-xs text-zinc-600 uppercase tracking-wide">
                        Disponível
                      </span>
                    </div>
                    <BarberChairIcon className="absolute -right-2 -bottom-2 h-12 w-12 text-white/[0.02]" />
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Appointment Detail Sheet */}
        <AppointmentDetailSheet
          appointment={selectedAppointment}
          open={sheetOpen}
          onOpenChange={handleCloseSheet}
          onCancelAppointment={onCancelAppointment}
          isCancelling={
            isCancelling && cancellingId === selectedAppointment?.id
          }
          onMarkNoShow={onMarkNoShow}
          isMarkingNoShow={
            isMarkingNoShow && markingNoShowId === selectedAppointment?.id
          }
        />
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
