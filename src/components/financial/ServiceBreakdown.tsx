"use client";

import { cn } from "@/lib/utils";
import { Scissors } from "lucide-react";
import type { ServiceBreakdownEntry } from "@/types/financial";

interface ServiceBreakdownProps {
  services: ServiceBreakdownEntry[];
  className?: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ServiceBreakdown({
  services,
  className,
}: ServiceBreakdownProps) {
  if (services.length === 0) {
    return (
      <div
        className={cn(
          "bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-8 text-center",
          className,
        )}
      >
        <Scissors className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">Nenhum serviço realizado no período</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
        <Scissors className="h-4 w-4 text-amber-500" />
        Serviços Realizados
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {services.map((service) => (
          <div
            key={service.serviceId}
            className={cn(
              "flex-shrink-0 w-44 p-4 rounded-xl transition-all duration-200",
              "bg-zinc-800/50 border border-zinc-700/50",
              "hover:border-amber-500/30 hover:bg-zinc-800/80",
            )}
          >
            {/* Count - large number */}
            <div className="text-4xl font-bold text-amber-400 mb-2">
              {service.count}
            </div>

            {/* Service name - truncated */}
            <p
              className="text-sm text-white font-medium truncate"
              title={service.name}
            >
              {service.name}
            </p>

            {/* Revenue */}
            <p className="text-xs text-zinc-400 mt-1">
              {formatCurrency(service.revenue)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
