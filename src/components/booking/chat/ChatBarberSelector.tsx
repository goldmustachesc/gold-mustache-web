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
      <div className="grid grid-cols-2 gap-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-14 bg-zinc-200 dark:bg-zinc-800 rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl p-4">
        Nenhum barbeiro disponível no momento.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {barbers.map((barber) => (
        <button
          key={barber.id}
          type="button"
          onClick={() => onSelect(barber)}
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl",
            "bg-zinc-100/80 border border-zinc-300/50 dark:bg-zinc-800/80 dark:border-zinc-700/50",
            "hover:border-primary/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800",
            "transition-all duration-200",
            "active:scale-[0.97]",
            "shadow-sm",
          )}
        >
          {barber.avatarUrl ? (
            <Image
              src={barber.avatarUrl}
              alt={barber.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-300 dark:ring-zinc-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-zinc-300 dark:ring-zinc-700">
              <User className="h-5 w-5 text-primary" />
            </div>
          )}
          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
            {barber.name}
          </span>
        </button>
      ))}
    </div>
  );
}
