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
          <div
            key={i}
            className="h-[72px] bg-zinc-200 dark:bg-zinc-800 rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl p-4">
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
            "flex items-center gap-3 px-4 py-3.5 rounded-xl",
            "bg-zinc-100/80 border border-zinc-300/50 dark:bg-zinc-800/80 dark:border-zinc-700/50",
            "hover:border-primary/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800",
            "transition-all duration-200",
            "active:scale-[0.98]",
            "text-left w-full",
            "shadow-sm",
          )}
        >
          <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
            <Scissors className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
              {service.name}
            </div>
            {service.description && (
              <div className="text-xs text-zinc-500 truncate mt-0.5">
                {service.description}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-primary text-sm">
              R$ {service.price.toFixed(2).replace(".", ",")}
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 justify-end mt-0.5">
              <Clock className="h-3 w-3" />
              <span>{service.duration} min</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
