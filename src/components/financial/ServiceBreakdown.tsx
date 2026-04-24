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
          "bg-muted rounded-xl border border-border p-8 text-center",
          className,
        )}
      >
        <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          Nenhum serviço realizado no período
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Scissors className="h-4 w-4 text-primary" />
        Serviços Realizados
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {services.map((service) => (
          <div
            key={service.serviceId}
            className={cn(
              "flex-shrink-0 w-44 p-4 rounded-xl transition-all duration-200",
              "bg-muted border border-border",
              "hover:border-primary/30 hover:bg-accent",
            )}
          >
            {/* Count - large number */}
            <div className="text-4xl font-bold text-primary mb-2">
              {service.count}
            </div>

            {/* Service name - truncated */}
            <p
              className="text-sm text-foreground font-medium truncate"
              title={service.name}
            >
              {service.name}
            </p>

            {/* Revenue */}
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(service.revenue)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
