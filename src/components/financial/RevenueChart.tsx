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
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Receita Diária
        </span>
      </div>

      {/* Scroll indicators */}
      {canScrollLeft && (
        <div className="absolute left-0 top-12 bottom-12 w-8 bg-gradient-to-r from-muted to-transparent z-10 pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-12 bottom-12 w-8 bg-gradient-to-l from-muted to-transparent z-10 pointer-events-none" />
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
                      ? "bg-gradient-to-t from-primary to-primary/70 group-hover:from-primary/90 group-hover:to-primary/60"
                      : "bg-accent",
                  )}
                />
              </div>

              {/* Day label */}
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  hasRevenue
                    ? "text-muted-foreground group-hover:text-primary"
                    : "text-muted-foreground",
                )}
              >
                {String(day).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scroll hint */}
      <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
        <div className="w-8 h-px bg-border" />
        <span className="uppercase tracking-wider">
          Arraste para o lado para ver mais
        </span>
        <div className="w-8 h-px bg-border" />
      </div>
    </div>
  );
}
