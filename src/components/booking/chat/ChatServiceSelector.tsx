"use client";

import { cn } from "@/lib/utils";
import type { ServiceData } from "@/types/booking";
import { Clock, Scissors } from "lucide-react";

interface ChatServiceSelectorProps {
  services: ServiceData[];
  onSelect: (service: ServiceData) => void;
  isLoading?: boolean;
}

export function ChatServiceSelector({
  services,
  onSelect,
  isLoading,
}: ChatServiceSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
        Nenhum serviço disponível no momento.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {services.map((service) => (
        <button
          key={service.id}
          type="button"
          onClick={() => onSelect(service)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-background border-2 border-muted",
            "hover:border-primary hover:bg-primary/5",
            "transition-all duration-200",
            "active:scale-[0.98]",
            "text-left w-full",
          )}
        >
          <div className="p-2 bg-primary/10 rounded-full shrink-0">
            <Scissors className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{service.name}</div>
            {service.description && (
              <div className="text-xs text-muted-foreground truncate">
                {service.description}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-primary text-sm">
              R$ {service.price.toFixed(2).replace(".", ",")}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{service.duration} min</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
