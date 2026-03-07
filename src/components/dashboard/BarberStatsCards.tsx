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
    <div className="grid grid-cols-2 gap-3">
      {/* Today Card - Orange/Gold gradient */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-4",
          "bg-gradient-to-br from-primary to-primary/70",
          "shadow-lg shadow-primary/20",
        )}
      >
        <div className="relative z-10">
          <p className="text-sm font-medium text-primary-foreground/90">Hoje</p>
          <div className="mt-1 flex items-center gap-1.5 text-primary-foreground/80">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-4 w-4"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-sm font-medium">
              {hideValues ? maskedValue : formatCurrency(todayRevenue)}
            </span>
          </div>
          <p className="mt-4 text-5xl font-bold text-primary-foreground">
            {todayCount}
          </p>
        </div>

        {/* Background icon */}
        <BarberChairIcon className="absolute -right-2 -bottom-2 h-24 w-24 text-primary-foreground/10" />
      </div>

      {/* Week Card - Light/Subtle */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-4",
          "bg-card/90 border border-border shadow-sm",
        )}
      >
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground">
            Esta semana
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-4 w-4"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-sm font-medium">
              {hideValues ? maskedValue : formatCurrency(weekRevenue)}
            </span>
          </div>
          <p className="mt-4 text-5xl font-bold text-foreground">{weekCount}</p>
        </div>

        {/* Background icon */}
        <BarberChairIcon className="absolute -right-2 -bottom-2 h-24 w-24 text-muted-foreground/30" />
      </div>
    </div>
  );
}
