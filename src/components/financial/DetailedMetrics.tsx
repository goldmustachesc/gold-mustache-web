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
    <div className="flex items-center justify-between py-3 border-b border-zinc-700/30 last:border-0">
      <div className="flex items-center gap-2">
        <span className={highlight ? "text-amber-500" : "text-zinc-500"}>
          {icon}
        </span>
        <span className="text-sm text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-sm font-semibold",
          highlight ? "text-amber-400" : "text-white",
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
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-amber-500" />
        Mais Dados
      </h3>

      <div className="bg-zinc-800/50 rounded-xl px-4 border border-zinc-700/50">
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
