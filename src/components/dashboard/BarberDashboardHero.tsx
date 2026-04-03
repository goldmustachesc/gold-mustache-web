"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppointmentWithDetails } from "@/types/booking";
import type {
  DailyHeroState,
  OperationalScheduleSlot,
} from "./buildDailyOperationalModel";

export type BarberDashboardHeroProps = {
  hideValues: boolean;
  hero: DailyHeroState;
  firstAvailableSlot: OperationalScheduleSlot | null;
  focusedAppointment: AppointmentWithDetails | null;
  locale: string;
  selectedDateStr: string;
  viewingToday: boolean;
  hasConfiguredWorkingHours: boolean;
  agendaSectionId?: string;
};

function clientLabel(
  appointment: AppointmentWithDetails,
  hideValues: boolean,
): string {
  if (hideValues) return "Nome oculto";
  return (
    appointment.client?.fullName ??
    appointment.guestClient?.fullName ??
    "Cliente"
  );
}

function serviceLabel(
  appointment: AppointmentWithDetails,
  hideValues: boolean,
): string {
  if (hideValues) return "Serviço oculto";
  return appointment.service.name;
}

function slotRangeLabel(slot: OperationalScheduleSlot): string {
  return `${slot.time} – ${slot.endTime}`;
}

export function BarberDashboardHero({
  hideValues,
  hero,
  firstAvailableSlot,
  focusedAppointment,
  locale,
  selectedDateStr,
  viewingToday,
  hasConfiguredWorkingHours,
  agendaSectionId = "agenda-do-dia",
}: BarberDashboardHeroProps) {
  const fillSlotTime =
    hero.kind === "available-slot" && hero.primaryTime
      ? hero.primaryTime
      : (firstAvailableSlot?.time ?? null);

  const fillSlotHref =
    fillSlotTime !== null
      ? `/${locale}/barbeiro/agendar?date=${encodeURIComponent(selectedDateStr)}&time=${encodeURIComponent(fillSlotTime)}`
      : null;

  const agendaHref = `#${agendaSectionId}`;

  let eyebrow: string;
  let primaryLine: string;
  let secondaryLine: string | null;
  let tertiaryLine: string | null;

  switch (hero.kind) {
    case "current-appointment": {
      eyebrow = "Agora";
      primaryLine = hero.primaryTime ?? "—";
      secondaryLine = focusedAppointment
        ? clientLabel(focusedAppointment, hideValues)
        : null;
      tertiaryLine = focusedAppointment
        ? serviceLabel(focusedAppointment, hideValues)
        : null;
      break;
    }
    case "next-appointment": {
      eyebrow = "Próximo cliente";
      primaryLine = hero.primaryTime ?? "—";
      secondaryLine = focusedAppointment
        ? clientLabel(focusedAppointment, hideValues)
        : null;
      tertiaryLine = focusedAppointment
        ? serviceLabel(focusedAppointment, hideValues)
        : null;
      break;
    }
    case "available-slot": {
      eyebrow = "Horário vago";
      primaryLine =
        firstAvailableSlot && hero.primaryTime
          ? slotRangeLabel(firstAvailableSlot)
          : (hero.primaryTime ?? "—");
      secondaryLine = "Intervalo livre para agendar ou bloquear.";
      tertiaryLine = null;
      break;
    }
    case "day-off": {
      eyebrow = viewingToday ? "Hoje" : "Este dia";
      primaryLine = "Dia de folga";
      secondaryLine = "Sem expediente nesta data.";
      tertiaryLine = null;
      break;
    }
    case "blocked-day": {
      eyebrow = viewingToday ? "Hoje" : "Este dia";
      primaryLine = "Dia bloqueado";
      secondaryLine = "Ausência ou bloqueio de agenda.";
      tertiaryLine = null;
      break;
    }
    case "unconfigured-hours": {
      eyebrow = "Expediente";
      primaryLine = "Horários não configurados";
      secondaryLine = "Configure seu expediente para ver a agenda.";
      tertiaryLine = null;
      break;
    }
    case "free-day": {
      eyebrow = viewingToday ? "Hoje" : "Este dia";
      if (viewingToday && hasConfiguredWorkingHours) {
        primaryLine = "Sem próximos horários hoje";
        secondaryLine =
          "Não há mais atendimentos ou lacunas a partir de agora.";
      } else {
        primaryLine = "Sem compromissos";
        secondaryLine = "Nada agendado neste dia.";
      }
      tertiaryLine = null;
      break;
    }
  }

  const showFillSlotPrimary =
    hero.kind === "available-slot" && Boolean(fillSlotHref);

  return (
    <section
      data-testid="barber-dashboard-hero"
      aria-label="Resumo operacional do dia"
      className={cn(
        "rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-sm lg:p-5 xl:p-6",
        "dark:border-primary/40 dark:from-card dark:via-card dark:to-primary/12",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {eyebrow}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {primaryLine}
      </p>
      {secondaryLine ? (
        <p className="mt-1 text-sm text-muted-foreground">{secondaryLine}</p>
      ) : null}
      {tertiaryLine ? (
        <p className="mt-0.5 text-sm font-medium text-foreground">
          {tertiaryLine}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {showFillSlotPrimary && fillSlotHref ? (
          <Button asChild size="sm" className="font-semibold">
            <Link href={fillSlotHref}>Preencher horário</Link>
          </Button>
        ) : null}

        {hero.kind === "next-appointment" ? (
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="font-semibold"
          >
            <Link href={agendaHref}>Ver agenda do dia</Link>
          </Button>
        ) : null}

        {showFillSlotPrimary ? (
          <Button asChild size="sm" variant="outline" className="font-semibold">
            <Link href={agendaHref}>Ver agenda do dia</Link>
          </Button>
        ) : null}

        {hero.kind === "current-appointment" && focusedAppointment ? (
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="font-semibold"
          >
            <Link href={agendaHref}>Ver atendimento</Link>
          </Button>
        ) : null}

        {hero.kind === "current-appointment" && !focusedAppointment ? (
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="font-semibold"
          >
            <Link href={agendaHref}>Ver agenda do dia</Link>
          </Button>
        ) : null}

        {hero.kind !== "available-slot" &&
        hero.kind !== "next-appointment" &&
        hero.kind !== "current-appointment" ? (
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="font-semibold"
          >
            <Link href={agendaHref}>Ver agenda do dia</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
