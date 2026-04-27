"use client";

import {
  CalendarOff,
  CalendarPlus,
  Clock3,
  DollarSign,
  Scissors,
  Users,
} from "lucide-react";
import { QuickAction } from "./QuickAction";

interface BarberDashboardDesktopSidebarProps {
  locale: string;
  absencesPageHref: string;
  dailyAppointmentsCount: number;
  availableSlotCount: number;
  dayRevenue: number;
  weekRevenue: number;
  hideValues: boolean;
  hasPartialAbsences: boolean;
  hasFullDayAbsence: boolean;
  isDayOff: boolean;
  hasConfiguredWorkingHours: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getOperationalNotice({
  hasPartialAbsences,
  hasFullDayAbsence,
  isDayOff,
  hasConfiguredWorkingHours,
}: Pick<
  BarberDashboardDesktopSidebarProps,
  | "hasPartialAbsences"
  | "hasFullDayAbsence"
  | "isDayOff"
  | "hasConfiguredWorkingHours"
>) {
  if (hasFullDayAbsence) {
    return {
      title: "Dia bloqueado",
      description: "A agenda está indisponível por ausência neste dia.",
      tone: "border-warning/30 bg-warning/10 text-foreground",
    };
  }

  if (isDayOff) {
    return {
      title: "Dia de folga",
      description: "Sem expediente configurado para esta data.",
      tone: "border-border/70 bg-card/50 text-foreground",
    };
  }

  if (!hasConfiguredWorkingHours) {
    return {
      title: "Expediente pendente",
      description: "Configure seus horários para liberar a agenda neste dia.",
      tone: "border-border/70 bg-card/50 text-foreground",
    };
  }

  if (hasPartialAbsences) {
    return {
      title: "Bloqueios parciais",
      description: "Existem horários bloqueados por ausência neste dia.",
      tone: "border-warning/30 bg-warning/10 text-foreground",
    };
  }

  return null;
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/80 bg-background/80 p-3 dark:border-border/90 dark:bg-background/60">
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
          {icon}
        </span>
        <p className="truncate text-xs font-medium leading-tight">{label}</p>
      </div>
      <p className="mt-3 text-xl font-semibold tabular-nums text-foreground xl:text-2xl">
        {value}
      </p>
    </div>
  );
}

export function BarberDashboardDesktopSidebar({
  locale,
  absencesPageHref,
  dailyAppointmentsCount,
  availableSlotCount,
  dayRevenue,
  weekRevenue,
  hideValues,
  hasPartialAbsences,
  hasFullDayAbsence,
  isDayOff,
  hasConfiguredWorkingHours,
}: BarberDashboardDesktopSidebarProps) {
  const headingId = "barber-dashboard-desktop-sidebar-heading";
  const maskedValue = "R$ ***,**";
  const operationalNotice = getOperationalNotice({
    hasPartialAbsences,
    hasFullDayAbsence,
    isDayOff,
    hasConfiguredWorkingHours,
  });

  return (
    <section
      data-testid="barber-dashboard-desktop-sidebar"
      aria-labelledby={headingId}
      className="rounded-2xl border border-border/80 bg-card/60 p-4 dark:border-border/90 dark:bg-card/75"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Mesa de operação
        </p>
        <h2
          id={headingId}
          className="mt-1 text-base font-semibold text-foreground"
        >
          Visão rápida do dia
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe o ritmo da agenda e acesse as ações mais úteis sem sair da
          bancada.
        </p>
      </div>

      {operationalNotice ? (
        <div
          className={`mt-4 rounded-xl border px-3 py-3 ${operationalNotice.tone}`}
        >
          <p className="text-sm font-semibold">{operationalNotice.title}</p>
          <p className="mt-1 text-sm text-foreground/80">
            {operationalNotice.description}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        <MetricCard
          label="Atendimentos do dia"
          value={String(dailyAppointmentsCount)}
          icon={<Scissors className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          label="Intervalos livres"
          value={String(availableSlotCount)}
          icon={<Clock3 className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          label="Receita do dia"
          value={hideValues ? maskedValue : formatCurrency(dayRevenue)}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          label="Receita da semana"
          value={hideValues ? maskedValue : formatCurrency(weekRevenue)}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ações rápidas
        </h3>
        <div className="mt-3 space-y-2">
          <QuickAction
            href={`/${locale}/barbeiro/agendar`}
            label="Agendar cliente"
            description="Criar novo horário"
            icon={<CalendarPlus className="h-5 w-5 text-muted-foreground" />}
          />
          <QuickAction
            href={`/${locale}/barbeiro/clientes`}
            label="Clientes"
            description="Histórico e retorno"
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          />
          <QuickAction
            href={absencesPageHref}
            label="Ausências"
            description="Bloquear período"
            icon={<CalendarOff className="h-5 w-5 text-muted-foreground" />}
          />
          <QuickAction
            href={`/${locale}/barbeiro/horarios`}
            label="Horários"
            description="Ajustar expediente"
            icon={<Clock3 className="h-5 w-5 text-muted-foreground" />}
          />
        </div>
      </div>
    </section>
  );
}
