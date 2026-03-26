"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, Percent } from "lucide-react";

interface MetricCardsProps {
  ticketMedio: number;
  occupancyRate: number;
  className?: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function MetricCards({
  ticketMedio,
  occupancyRate,
  className,
}: MetricCardsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {/* Ticket Médio */}
      <div
        className={cn(
          "p-5 rounded-xl",
          "bg-gradient-to-br from-amber-500/20 to-yellow-600/10",
          "border border-amber-500/30",
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-amber-400 uppercase tracking-wide">
            Ticket Médio
          </span>
        </div>
        <div className="text-2xl font-bold text-amber-400">
          {formatCurrency(ticketMedio)}
        </div>
      </div>

      {/* Taxa de Ocupação */}
      <div
        className={cn(
          "p-5 rounded-xl",
          "bg-zinc-800/50",
          "border border-zinc-700/50",
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Percent className="h-4 w-4 text-zinc-400" />
          <span className="text-xs text-zinc-400 uppercase tracking-wide">
            Taxa de Ocupação
          </span>
        </div>
        <div className="text-2xl font-bold text-white">
          {occupancyRate}
          <span className="text-lg ml-0.5 text-zinc-400">%</span>
        </div>
      </div>
    </div>
  );
}
