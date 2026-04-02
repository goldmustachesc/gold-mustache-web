"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  AppointmentWithDetails,
  BarberAbsenceData,
  BarberWorkingHoursDay,
} from "@/types/booking";
import { Calendar, CalendarOff, Clock, Phone } from "lucide-react";
import { formatDateDdMmYyyyInSaoPaulo } from "@/utils/datetime";
import {
  getMinutesUntilAppointment,
  minutesToTime,
  parseTimeToMinutes,
} from "@/utils/time-slots";
import { ApiError, apiMutate } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AppointmentDetailSheet } from "@/components/barber/AppointmentDetailSheet";
import { getDashboardAppointmentStatusUi } from "@/components/barber/appointment-status-ui";
import { BarberChairIcon } from "./BarberChairIcon";
import { AppointmentCard } from "./AppointmentCard";
import { EmptySlot } from "./EmptySlot";
import { SlotActionSheet } from "./SlotActionSheet";

interface DailyScheduleProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  absences?: BarberAbsenceData[];
  onCreateAppointmentFromSlot?: (startTime: string) => void;
  onCreateAbsenceFromSlot?: (startTime: string, endTime: string) => void;
  onCancelAppointment: (id: string, reason: string) => void;
  isCancelling?: boolean;
  cancellingId?: string | null;
  onMarkNoShow?: (id: string) => void;
  isMarkingNoShow?: boolean;
  markingNoShowId?: string | null;
  onMarkComplete?: (id: string) => void;
  isMarkingComplete?: boolean;
  markingCompleteId?: string | null;
  variant?: "default" | "compact";
  hideValues?: boolean;
  workingHours?: BarberWorkingHoursDay | null;
}

// Represents a time slot in the schedule (either empty or with an appointment)
interface ScheduleSlot {
  time: string;
  endTime: string;
  appointment: AppointmentWithDetails | null;
  isAvailable: boolean;
  isBlockedByAbsence: boolean;
  absenceReason: string | null;
}

interface CompactTimelineItem {
  type: "appointment" | "slot";
  sortMinutes: number;
  startTime: string;
  appointment?: AppointmentWithDetails;
  slot?: ScheduleSlot;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function isFullDayAbsence(absence: BarberAbsenceData): boolean {
  return !absence.startTime || !absence.endTime;
}

export function DailySchedule({
  date,
  appointments,
  absences = [],
  onCreateAppointmentFromSlot,
  onCreateAbsenceFromSlot,
  onCancelAppointment,
  isCancelling,
  cancellingId,
  onMarkNoShow,
  isMarkingNoShow,
  markingNoShowId,
  onMarkComplete,
  isMarkingComplete,
  markingCompleteId,
  variant = "default",
  hideValues = false,
  workingHours,
}: DailyScheduleProps) {
  const completedUi = getDashboardAppointmentStatusUi("COMPLETED");
  const noShowUi = getDashboardAppointmentStatusUi("NO_SHOW");
  const maskedValue = "R$ ***,**";
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(
    null,
  );
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [slotSheetSlot, setSlotSheetSlot] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const fullDayAbsence = useMemo(
    () => absences.find(isFullDayAbsence) ?? null,
    [absences],
  );
  const partialDayAbsences = useMemo(
    () =>
      absences.filter(
        (
          absence,
        ): absence is BarberAbsenceData & {
          startTime: string;
          endTime: string;
        } => Boolean(absence.startTime && absence.endTime),
      ),
    [absences],
  );
  const hasFullDayAbsence = fullDayAbsence !== null;

  const availabilitySlots = useMemo((): ScheduleSlot[] => {
    if (hasFullDayAbsence) {
      return [];
    }

    // If no working hours or not working, return empty
    if (
      !workingHours ||
      !workingHours.isWorking ||
      !workingHours.startTime ||
      !workingHours.endTime
    ) {
      return [];
    }

    const dayAppointments = [...appointments].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
    const workStart = parseTimeToMinutes(workingHours.startTime);
    const workEnd = parseTimeToMinutes(workingHours.endTime);
    const breakStartMinutes = workingHours.breakStart
      ? parseTimeToMinutes(workingHours.breakStart)
      : null;
    const breakEndMinutes = workingHours.breakEnd
      ? parseTimeToMinutes(workingHours.breakEnd)
      : null;
    const boundaries = new Set<number>([workStart, workEnd]);

    if (breakStartMinutes !== null && breakEndMinutes !== null) {
      boundaries.add(breakStartMinutes);
      boundaries.add(breakEndMinutes);
    }

    for (const appointment of dayAppointments) {
      const appointmentStart = parseTimeToMinutes(appointment.startTime);
      const appointmentEnd = parseTimeToMinutes(appointment.endTime);

      if (appointmentEnd <= workStart || appointmentStart >= workEnd) {
        continue;
      }

      boundaries.add(Math.max(appointmentStart, workStart));
      boundaries.add(Math.min(appointmentEnd, workEnd));
    }

    for (const absence of partialDayAbsences) {
      const absenceStart = parseTimeToMinutes(absence.startTime);
      const absenceEnd = parseTimeToMinutes(absence.endTime);

      if (absenceEnd <= workStart || absenceStart >= workEnd) {
        continue;
      }

      boundaries.add(Math.max(absenceStart, workStart));
      boundaries.add(Math.min(absenceEnd, workEnd));
    }

    const sortedBoundaries = [...boundaries]
      .filter((minutes) => minutes >= workStart && minutes <= workEnd)
      .sort((a, b) => a - b);
    const slots: ScheduleSlot[] = [];

    for (let index = 0; index < sortedBoundaries.length - 1; index++) {
      const slotStart = sortedBoundaries[index];
      const slotEnd = sortedBoundaries[index + 1];

      if (slotEnd <= slotStart) {
        continue;
      }

      if (
        breakStartMinutes !== null &&
        breakEndMinutes !== null &&
        slotStart >= breakStartMinutes &&
        slotEnd <= breakEndMinutes
      ) {
        continue;
      }

      const overlapsAppointment = dayAppointments.some((appointment) => {
        const appointmentStart = parseTimeToMinutes(appointment.startTime);
        const appointmentEnd = parseTimeToMinutes(appointment.endTime);

        return slotStart < appointmentEnd && appointmentStart < slotEnd;
      });

      if (overlapsAppointment) {
        continue;
      }

      const blockingAbsence =
        partialDayAbsences.find((absence) => {
          const absenceStart = parseTimeToMinutes(absence.startTime);
          const absenceEnd = parseTimeToMinutes(absence.endTime);

          return slotStart < absenceEnd && absenceStart < slotEnd;
        }) ?? null;

      slots.push({
        time: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        appointment: null,
        isAvailable: !blockingAbsence,
        isBlockedByAbsence: Boolean(blockingAbsence),
        absenceReason: blockingAbsence?.reason ?? null,
      });
    }

    return slots;
  }, [workingHours, appointments, hasFullDayAbsence, partialDayAbsences]);

  const handleOpenAppointmentDetail = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setSheetOpen(true);
  };

  const handleOpenSlotSheet = (start: string, end: string) => {
    setSlotSheetSlot({ start, end });
  };

  const handleSelectTimeFromSlotSheet = (time: string) => {
    setSlotSheetSlot(null);
    onCreateAppointmentFromSlot?.(time);
  };

  const handleAbsenceFromSlotSheet = (startTime: string, endTime: string) => {
    setSlotSheetSlot(null);
    onCreateAbsenceFromSlot?.(startTime, endTime);
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
      const payload = await apiMutate<{
        type: string;
        message: string;
        whatsappUrl?: string;
      }>(`/api/appointments/${appointmentId}/reminder`, "POST");

      if (payload.type === "notification_and_whatsapp" && payload.whatsappUrl) {
        toast.success("Notificação enviada! Abrindo WhatsApp...");
        window.open(payload.whatsappUrl, "_blank");
      } else if (payload.type === "whatsapp" && payload.whatsappUrl) {
        window.open(payload.whatsappUrl, "_blank");
        toast.success("WhatsApp aberto com mensagem de lembrete");
      } else if (payload.type === "notification") {
        toast.success("Lembrete enviado para o cliente!");
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Erro ao enviar lembrete";
      toast.error(message);
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

  const compactAppointmentCardProps = {
    onOpenDetail: handleOpenAppointmentDetail,
    onSendReminder: handleSendReminder,
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
  };

  if (variant === "compact") {
    // Check if it's a day off (not working)
    const isDayOff = workingHours && !workingHours.isWorking;
    const hasPartialAbsences = partialDayAbsences.length > 0;
    const fullDayAbsenceReason = fullDayAbsence?.reason?.trim() ?? null;
    const hasAppointments = appointments.length > 0;
    const hasConfiguredWorkingHours = Boolean(
      workingHours?.isWorking && workingHours.startTime && workingHours.endTime,
    );
    const timelineItems = [
      ...sortedAppointments.map(
        (appointment): CompactTimelineItem => ({
          type: "appointment",
          sortMinutes: parseTimeToMinutes(appointment.startTime),
          startTime: appointment.startTime,
          appointment,
        }),
      ),
      ...(!hasFullDayAbsence && !isDayOff && hasConfiguredWorkingHours
        ? availabilitySlots.map(
            (slot): CompactTimelineItem => ({
              type: "slot",
              sortMinutes: parseTimeToMinutes(slot.time),
              startTime: slot.time,
              slot,
            }),
          )
        : []),
    ].sort((left, right) => {
      if (left.sortMinutes !== right.sortMinutes) {
        return left.sortMinutes - right.sortMinutes;
      }

      return left.type === "appointment" ? -1 : 1;
    });
    const availableSlotCount = availabilitySlots.filter(
      (slot) => slot.isAvailable,
    ).length;
    const timelineByHour = timelineItems.reduce(
      (acc, slot) => {
        const hour = slot.startTime.split(":")[0];
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(slot);
        return acc;
      },
      {} as Record<string, CompactTimelineItem[]>,
    );
    const timelineHours = Object.keys(timelineByHour).sort(
      (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
    );

    return (
      <div className="space-y-4">
        {hasFullDayAbsence && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4">
            <div className="flex items-start gap-3">
              <CalendarOff className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  Agenda bloqueada por ausência
                </p>
                <p className="mt-1 text-sm text-foreground/80">
                  Nenhum horário ficará disponível para este dia.
                </p>
                {fullDayAbsenceReason && (
                  <p className="mt-2 text-sm text-foreground/80">
                    Motivo: {fullDayAbsenceReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isDayOff && (
          <div className="rounded-xl border border-border/70 bg-card/40 px-4 py-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Dia de folga</p>
                <p className="mt-1 text-sm text-foreground/80">
                  Você não trabalha neste dia, mas os atendimentos agendados
                  continuam listados abaixo.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Horários do dia
            </h3>
            <p className="text-sm text-muted-foreground">
              {hasAppointments
                ? `${appointments.length} atendimento${appointments.length > 1 ? "s" : ""} no dia`
                : "Nenhum atendimento agendado para este dia."}
              {!hasFullDayAbsence &&
                !isDayOff &&
                hasConfiguredWorkingHours &&
                ` • ${availableSlotCount} intervalo${availableSlotCount === 1 ? "" : "s"} livre${availableSlotCount === 1 ? "" : "s"}`}
            </p>
          </div>

          {!hasConfiguredWorkingHours && !hasFullDayAbsence && !isDayOff && (
            <div className="rounded-xl border border-border/70 bg-card/30 px-4 py-3">
              <p className="text-sm text-foreground">
                Expediente não configurado para exibir os horários livres deste
                dia.
              </p>
            </div>
          )}

          {hasPartialAbsences &&
            hasConfiguredWorkingHours &&
            !isDayOff &&
            !hasFullDayAbsence && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
                <p className="text-sm text-foreground">
                  Existem horários bloqueados por ausência neste dia.
                </p>
              </div>
            )}

          {timelineItems.length > 0 ? (
            timelineHours.map((hour) => (
              <div key={hour} className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono tabular-nums">{hour}:00</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {timelineByHour[hour].map((item) =>
                  item.type === "appointment" && item.appointment ? (
                    <AppointmentCard
                      key={item.appointment.id}
                      appointment={item.appointment}
                      {...compactAppointmentCardProps}
                    />
                  ) : item.slot ? (
                    <EmptySlot
                      key={`empty-${item.slot.time}`}
                      time={item.slot.time}
                      endTime={item.slot.endTime}
                      isBlockedByAbsence={item.slot.isBlockedByAbsence}
                      absenceReason={item.slot.absenceReason}
                      onOpenSheet={
                        onCreateAppointmentFromSlot || onCreateAbsenceFromSlot
                          ? handleOpenSlotSheet
                          : undefined
                      }
                    />
                  ) : null,
                )}
              </div>
            ))
          ) : !hasConfiguredWorkingHours && !hasFullDayAbsence && !isDayOff ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarberChairIcon className="mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">
                Expediente não configurado
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure o expediente para visualizar os horários livres deste
                dia.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarberChairIcon className="mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">
                {hasFullDayAbsence
                  ? "Dia bloqueado"
                  : isDayOff
                    ? "Dia de folga"
                    : "Dia livre!"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFullDayAbsence
                  ? "Ausência de dia inteiro registrada."
                  : isDayOff
                    ? "Você não trabalha neste dia."
                    : "Nenhum agendamento para este dia"}
              </p>
            </div>
          )}
        </section>

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
          onMarkComplete={onMarkComplete}
          isMarkingComplete={
            isMarkingComplete && markingCompleteId === selectedAppointment?.id
          }
        />

        {/* Slot Action Sheet */}
        <SlotActionSheet
          open={slotSheetSlot !== null}
          onOpenChange={(open) => {
            if (!open) setSlotSheetSlot(null);
          }}
          slotStart={slotSheetSlot?.start ?? ""}
          slotEnd={slotSheetSlot?.end ?? ""}
          onSelectTime={handleSelectTimeFromSlotSheet}
          onCreateAbsence={handleAbsenceFromSlotSheet}
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
          {hasFullDayAbsence
            ? "Agenda bloqueada por ausência"
            : appointments.length === 0
              ? "Nenhum agendamento para este dia"
              : `${appointments.length} agendamento${appointments.length > 1 ? "s" : ""}`}
        </p>
      </CardHeader>

      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            {hasFullDayAbsence ? (
              <>
                <CalendarOff className="h-12 w-12 mx-auto text-primary/60 mb-3" />
                <p className="text-muted-foreground">
                  Agenda bloqueada por ausência.
                </p>
              </>
            ) : (
              <>
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Dia livre!</p>
              </>
            )}
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
                    const statusUi = getDashboardAppointmentStatusUi(
                      appointment.status,
                    );
                    const isPast = minutesUntil <= 0;

                    return (
                      <div
                        key={appointment.id}
                        className={cn(
                          "p-3 rounded-lg border bg-card",
                          statusUi?.surfaceClassName,
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <p className="font-medium">
                              {appointment.client?.fullName ||
                                appointment.guestClient?.fullName ||
                                "Cliente"}
                            </p>
                            {statusUi && (
                              <Badge
                                className={["border", statusUi.badgeClassName]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {statusUi.label}
                              </Badge>
                            )}
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
                            {isConfirmed && isPast && onMarkComplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={completedUi?.actionClassName}
                                onClick={() => onMarkComplete(appointment.id)}
                                disabled={
                                  isMarkingComplete &&
                                  markingCompleteId === appointment.id
                                }
                              >
                                Concluir
                              </Button>
                            )}
                            {isConfirmed && isPast && onMarkNoShow && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={noShowUi?.actionClassName}
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
