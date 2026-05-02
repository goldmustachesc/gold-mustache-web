"use client";

import { cn } from "@/lib/utils";
import type { BarberData } from "@/types/booking";
import Image from "next/image";
import { Shuffle } from "lucide-react";

export const ANY_BARBER_ID = "any";

interface ChatBarberSelectorProps {
  barbers: BarberData[];
  onSelect: (barber: BarberData) => void;
  isLoading?: boolean;
  showAnyBarber?: boolean;
}

/** Initials for avatar fallback: first letter of first two words, or first two letters of a single name. */
export function barberNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    const w = parts[0];
    if (!w) return "?";
    const upper = w.toLocaleUpperCase();
    return upper.length <= 2 ? upper : upper.slice(0, 2);
  }
  const a = parts[0]?.[0];
  const b = parts[1]?.[0];
  if (!a || !b) {
    const w = parts[0];
    return w ? w.toLocaleUpperCase().slice(0, 2) : "?";
  }
  return `${a}${b}`.toLocaleUpperCase();
}

export function ChatBarberSelector({
  barbers,
  onSelect,
  isLoading,
  showAnyBarber = true,
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
      {showAnyBarber !== false && (
        <button
          type="button"
          onClick={() =>
            onSelect({
              id: ANY_BARBER_ID,
              name: "Qualquer barbeiro",
              avatarUrl: null,
            })
          }
          className={cn(
            "flex w-full cursor-pointer flex-col items-center gap-2 px-2 py-4 text-center rounded-xl",
            "bg-zinc-100/80 border border-dashed border-zinc-400/60 dark:bg-zinc-800/80 dark:border-zinc-500/50",
            "hover:border-primary/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800",
            "transition-all duration-200",
            "active:scale-[0.97]",
            "shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900",
          )}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200/80 dark:bg-zinc-700/80 ring-2 ring-zinc-300 dark:ring-zinc-600"
            aria-hidden
          >
            <Shuffle className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="w-full font-medium text-sm text-zinc-600 dark:text-zinc-300 leading-tight">
            Qualquer barbeiro
          </span>
        </button>
      )}
      {barbers.map((barber) => (
        <button
          key={barber.id}
          type="button"
          onClick={() => onSelect(barber)}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center gap-2 px-2 py-4 text-center rounded-xl",
            "bg-zinc-100/80 border border-zinc-300/50 dark:bg-zinc-800/80 dark:border-zinc-700/50",
            "hover:border-primary/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800",
            "transition-all duration-200",
            "active:scale-[0.97]",
            "shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900",
          )}
        >
          {barber.avatarUrl ? (
            <Image
              src={barber.avatarUrl}
              alt={barber.name}
              width={48}
              height={48}
              className="w-12 h-12 shrink-0 rounded-full object-cover ring-2 ring-zinc-300 dark:ring-zinc-700"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-zinc-300 dark:ring-zinc-700"
              aria-hidden
            >
              <span className="text-sm font-bold text-primary">
                {barberNameInitials(barber.name)}
              </span>
            </div>
          )}
          <span className="w-full font-medium text-sm text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-2">
            {barber.name}
          </span>
        </button>
      ))}
    </div>
  );
}
