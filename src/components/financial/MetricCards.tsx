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
          "bg-gradient-to-br from-primary/20 to-primary/10",
          "border border-primary/30",
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-xs text-primary uppercase tracking-wide">
            Ticket Médio
          </span>
        </div>
        <div className="text-2xl font-bold text-primary">
          {formatCurrency(ticketMedio)}
        </div>
      </div>

      {/* Taxa de Ocupação */}
      <div className={cn("p-5 rounded-xl", "bg-muted", "border border-border")}>
        <div className="flex items-center gap-2 mb-2">
          <Percent className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Taxa de Ocupação
          </span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {occupancyRate}
          <span className="text-lg ml-0.5 text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  );
}
