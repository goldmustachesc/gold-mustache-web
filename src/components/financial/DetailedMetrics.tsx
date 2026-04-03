"use client";

import { cn } from "@/lib/utils";
import {
  Users,
  Clock,
  Briefcase,
  Coffee,
  CalendarX,
  BarChart3,
} from "lucide-react";

interface DetailedMetricsProps {
  uniqueClients: number;
  availableHours: number;
  workedHours: number;
  idleHours: number;
  closedHours: number;
  className?: string;
}

interface MetricRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function MetricRow({ label, value, icon, highlight }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className={highlight ? "text-primary" : "text-muted-foreground"}>
          {icon}
        </span>
        <span className="text-sm text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-sm font-semibold",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DetailedMetrics({
  uniqueClients,
  availableHours,
  workedHours,
  idleHours,
  closedHours,
  className,
}: DetailedMetricsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        Mais Dados
      </h3>

      <div className="bg-muted rounded-xl px-4 border border-border">
        <MetricRow
          label="Clientes Únicos"
          value={String(uniqueClients)}
          icon={<Users className="h-4 w-4" />}
          highlight
        />
        <MetricRow
          label="Horas Disponíveis"
          value={`${availableHours} hrs`}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricRow
          label="Horas Trabalhadas"
          value={`${workedHours} hrs`}
          icon={<Briefcase className="h-4 w-4" />}
          highlight
        />
        <MetricRow
          label="Tempo Ocioso"
          value={`${idleHours} hrs`}
          icon={<Coffee className="h-4 w-4" />}
        />
        <MetricRow
          label="Agenda Fechada"
          value={`${closedHours} hrs`}
          icon={<CalendarX className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
