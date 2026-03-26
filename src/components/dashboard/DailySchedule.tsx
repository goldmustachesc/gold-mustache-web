"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  AppointmentWithDetails,
  BarberAbsenceData,
  BarberWorkingHoursDay,
} from "@/types/booking";
import { Calendar, CalendarOff, Clock, Phone } from "lucide-react";
import { formatDateDdMmYyyyInSaoPaulo } from "@/utils/datetime";
import {
  getMinutesUntilAppointment,
  generateTimeSlots,
  parseTimeToMinutes,
  addMinutesToTime,
} from "@/utils/time-slots";
import { ApiError, apiMutate } from "@/lib/api/client";
import { toast } from "sonner";
import { AppointmentDetailSheet } from "@/components/barber/AppointmentDetailSheet";
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

// Slot duration in minutes for generating timeline
const SLOT_DURATION = 30;

// Represents a time slot in the schedule (either empty or with an appointment)
interface ScheduleSlot {
  time: string;
  endTime: string;
  appointment: AppointmentWithDetails | null;
  isAvailable: boolean;
  isBlockedByAbsence: boolean;
  absenceReason: string | null;
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

  // Generate complete schedule with empty slots
  const scheduleSlots = useMemo((): ScheduleSlot[] => {
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
          isBlockedByAbsence: false,
          absenceReason: null,
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
          const slotEndTime = addMinutesToTime(slot.time, SLOT_DURATION);
          const slotStartMinutes = parseTimeToMinutes(slot.time);
          const slotEndMinutes = parseTimeToMinutes(slotEndTime);
          const blockingAbsence =
            partialDayAbsences.find((absence) => {
              const absenceStart = parseTimeToMinutes(absence.startTime);
              const absenceEnd = parseTimeToMinutes(absence.endTime);
              return (
                slotStartMinutes < absenceEnd && absenceStart < slotEndMinutes
              );
            }) ?? null;

          // Empty slot
          schedule.push({
            time: slot.time,
            endTime: slotEndTime,
            appointment: null,
            isAvailable: !blockingAbsence,
            isBlockedByAbsence: Boolean(blockingAbsence),
            absenceReason: blockingAbsence?.reason ?? null,
          });
        }
        slotIndex++;
      }
    }

    return schedule;
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

  if (variant === "compact") {
    // Check if it's a day off (not working)
    const isDayOff = workingHours && !workingHours.isWorking;
    const hasPartialAbsences = partialDayAbsences.length > 0;
    const fullDayAbsenceReason = fullDayAbsence?.reason?.trim() ?? null;

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
        {hasFullDayAbsence ? (
          <>
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4">
              <div className="flex items-start gap-3">
                <CalendarOff className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    Agenda bloqueada por ausência
                  </p>
                  <p className="text-sm mt-1 text-foreground/80">
                    Nenhum horário ficará disponível para este dia.
                  </p>
                  {fullDayAbsenceReason && (
                    <p className="text-sm mt-2 text-foreground/80">
                      Motivo: {fullDayAbsenceReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarberChairIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg font-medium">
                  Dia bloqueado
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Ausência de dia inteiro registrada.
                </p>
              </div>
            ) : (
              hours.map((hour) => (
                <div key={hour} className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <span>{hour}:00</span>
                    <div className="flex-1 h-px bg-border" />
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
                      onMarkComplete={onMarkComplete}
                      isMarkingComplete={isMarkingComplete}
                      markingCompleteId={markingCompleteId}
                      hideValues={hideValues}
                      maskedValue={maskedValue}
                    />
                  ))}
                </div>
              ))
            )}
          </>
        ) : isDayOff ? (
          // Day off state
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarberChairIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg font-medium">
              Dia de folga
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Você não trabalha neste dia
            </p>
          </div>
        ) : !hasWorkingHours && appointments.length === 0 ? (
          // No working hours configured and no appointments
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarberChairIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg font-medium">
              Dia livre!
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Nenhum agendamento para este dia
            </p>
          </div>
        ) : !hasWorkingHours ? (
          // Fallback: show only appointments (old behavior)
          hours.map((hour) => (
            <div key={hour} className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>{hour}:00</span>
                <div className="flex-1 h-px bg-border" />
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
                  onMarkComplete={onMarkComplete}
                  isMarkingComplete={isMarkingComplete}
                  markingCompleteId={markingCompleteId}
                  hideValues={hideValues}
                  maskedValue={maskedValue}
                />
              ))}
            </div>
          ))
        ) : (
          // Full schedule with empty slots
          <>
            {hasPartialAbsences && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
                <p className="text-sm text-foreground">
                  Existem horários bloqueados por ausência neste dia.
                </p>
              </div>
            )}
            {scheduleHours.map((hour) => (
              <div key={hour} className="space-y-2">
                {/* Hour marker */}
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <span>{hour}:00</span>
                  <div className="flex-1 h-px bg-border" />
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
                        onMarkComplete={onMarkComplete}
                        isMarkingComplete={isMarkingComplete}
                        markingCompleteId={markingCompleteId}
                        hideValues={hideValues}
                        maskedValue={maskedValue}
                      />
                    );
                  }

                  return (
                    <EmptySlot
                      key={`empty-${slot.time}`}
                      time={slot.time}
                      endTime={slot.endTime}
                      isBlockedByAbsence={slot.isBlockedByAbsence}
                      absenceReason={slot.absenceReason}
                      onOpenSheet={
                        onCreateAppointmentFromSlot || onCreateAbsenceFromSlot
                          ? handleOpenSlotSheet
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
          </>
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
                            {isConfirmed && isPast && onMarkComplete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
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
