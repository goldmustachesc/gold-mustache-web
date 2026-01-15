"use client";

import { cn } from "@/lib/utils";

interface BarberStatsCardsProps {
  todayCount: number;
  todayRevenue: number;
  weekCount: number;
  weekRevenue: number;
  hideValues?: boolean;
}

// Simple barber chair SVG icon (decorative)
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
          "bg-gradient-to-br from-amber-500 to-amber-700",
          "shadow-lg shadow-amber-500/20",
        )}
      >
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/90">Hoje</p>
          <div className="mt-1 flex items-center gap-1.5 text-white/80">
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
          <p className="mt-4 text-5xl font-bold text-white">{todayCount}</p>
        </div>

        {/* Background icon */}
        <BarberChairIcon className="absolute -right-2 -bottom-2 h-24 w-24 text-white/10" />
      </div>

      {/* Week Card - Light/Subtle */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-4",
          "bg-zinc-100 dark:bg-zinc-800/50",
          "border border-zinc-200 dark:border-zinc-700",
        )}
      >
        <div className="relative z-10">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Esta semana
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
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
          <p className="mt-4 text-5xl font-bold text-zinc-900 dark:text-zinc-100">
            {weekCount}
          </p>
        </div>

        {/* Background icon */}
        <BarberChairIcon className="absolute -right-2 -bottom-2 h-24 w-24 text-zinc-300/50 dark:text-zinc-600/30" />
      </div>
    </div>
  );
}
