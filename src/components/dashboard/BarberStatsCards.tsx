"use client";

import { cn } from "@/lib/utils";
import { BarberChairIcon } from "./BarberChairIcon";

interface BarberStatsCardsProps {
  todayCount: number;
  todayRevenue: number;
  weekCount: number;
  weekRevenue: number;
  hideValues?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function BarberStatsCards({
  todayCount,
  todayRevenue,
  weekCount,
  weekRevenue,
  hideValues = false,
}: BarberStatsCardsProps) {
  const maskedValue = "R$ ***,**";
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {/* Hoje — destaque pontual na marca (borda), sem gradiente dominante */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-card p-3",
          "border-l-[3px] border-l-primary shadow-sm",
        )}
      >
        <div className="relative z-10">
          <p className="text-xs font-medium text-muted-foreground">Hoje</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-xs font-medium tabular-nums">
              {hideValues ? maskedValue : formatCurrency(todayRevenue)}
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {todayCount}
          </p>
        </div>

        <BarberChairIcon className="pointer-events-none absolute -right-1 -bottom-1 h-16 w-16 text-muted-foreground/15" />
      </div>

      {/* Semana — plano de fundo neutro */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/80 bg-muted/30 p-3",
          "shadow-sm",
        )}
      >
        <div className="relative z-10">
          <p className="text-xs font-medium text-muted-foreground">
            Esta semana
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-xs font-medium tabular-nums">
              {hideValues ? maskedValue : formatCurrency(weekRevenue)}
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {weekCount}
          </p>
        </div>

        <BarberChairIcon className="pointer-events-none absolute -right-1 -bottom-1 h-16 w-16 text-muted-foreground/20" />
      </div>
    </div>
  );
}
