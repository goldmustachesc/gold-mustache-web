"use client";

import { cn } from "@/lib/utils";
import type { BarberData } from "@/types/booking";
import { User } from "lucide-react";
import Image from "next/image";

interface ChatBarberSelectorProps {
  barbers: BarberData[];
  onSelect: (barber: BarberData) => void;
  isLoading?: boolean;
}

export function ChatBarberSelector({
  barbers,
  onSelect,
  isLoading,
}: ChatBarberSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 w-36 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
        Nenhum barbeiro disponível no momento.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {barbers.map((barber) => (
        <button
          key={barber.id}
          type="button"
          onClick={() => onSelect(barber)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-background border-2 border-muted",
            "hover:border-primary hover:bg-primary/5",
            "transition-all duration-200",
            "active:scale-95",
          )}
        >
          {barber.avatarUrl ? (
            <Image
              src={barber.avatarUrl}
              alt={barber.name}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
          <span className="font-medium text-sm">{barber.name}</span>
        </button>
      ))}
    </div>
  );
}
