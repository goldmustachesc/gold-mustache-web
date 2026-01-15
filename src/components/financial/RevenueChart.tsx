"use client";

import { cn } from "@/lib/utils";
import type { DailyRevenueEntry } from "@/types/financial";
import { useRef, useState, useEffect, useCallback } from "react";
import { TrendingUp } from "lucide-react";

interface RevenueChartProps {
  dailyRevenue: DailyRevenueEntry[];
  className?: string;
}

export function RevenueChart({ dailyRevenue, className }: RevenueChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const maxRevenue = Math.max(...dailyRevenue.map((d) => d.revenue), 1);

  const checkScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft <
          container.scrollWidth - container.clientWidth - 10,
      );
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      checkScroll();
      return () => container.removeEventListener("scroll", checkScroll);
    }
  }, [checkScroll]);

  return (
    <div className={cn("relative", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
          Receita Diária
        </span>
      </div>

      {/* Scroll indicators */}
      {canScrollLeft && (
        <div className="absolute left-0 top-12 bottom-12 w-8 bg-gradient-to-r from-zinc-800/80 to-transparent z-10 pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-12 bottom-12 w-8 bg-gradient-to-l from-zinc-800/80 to-transparent z-10 pointer-events-none" />
      )}

      {/* Chart container */}
      <div
        ref={scrollContainerRef}
        className="flex items-end gap-1 overflow-x-auto pb-2 scrollbar-hide"
        style={{ height: "180px" }}
      >
        {dailyRevenue.map((entry) => {
          const day = Number.parseInt(entry.date.split("-")[2], 10);
          const heightPercent =
            maxRevenue > 0 ? (entry.revenue / maxRevenue) * 100 : 0;
          const hasRevenue = entry.revenue > 0;

          return (
            <div
              key={entry.date}
              className="flex flex-col items-center gap-1 min-w-[28px] group"
            >
              {/* Bar */}
              <div
                className="relative w-5 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max(heightPercent, 2)}%`,
                  minHeight: "8px",
                }}
              >
                <div
                  className={cn(
                    "absolute inset-0 rounded-t-sm transition-colors",
                    hasRevenue
                      ? "bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-yellow-400"
                      : "bg-zinc-700",
                  )}
                />
              </div>

              {/* Day label */}
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  hasRevenue
                    ? "text-zinc-400 group-hover:text-amber-400"
                    : "text-zinc-600",
                )}
              >
                {String(day).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scroll hint */}
      <div className="flex items-center justify-center gap-2 mt-2 text-xs text-zinc-500">
        <div className="w-8 h-px bg-zinc-700" />
        <span className="uppercase tracking-wider">
          Arraste para o lado para ver mais
        </span>
        <div className="w-8 h-px bg-zinc-700" />
      </div>
    </div>
  );
}
