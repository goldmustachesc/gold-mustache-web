"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { RevealOnScroll } from "./RevealOnScroll";

interface ResponsiveCardGridProps<T> {
  items: readonly T[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T, index: number) => ReactNode;
  desktopCols?: 2 | 3 | 4;
  staggerDelay?: number;
  className?: string;
}

const colsClass: Record<number, string> = {
  2: "md:grid md:grid-cols-2",
  3: "md:grid md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid md:grid-cols-2 lg:grid-cols-4",
};

export function ResponsiveCardGrid<T>({
  items,
  keyExtractor,
  renderCard,
  desktopCols = 3,
  staggerDelay = 0.08,
  className,
}: ResponsiveCardGridProps<T>) {
  return (
    <>
      {/* Mobile: horizontal scroll with snap */}
      <div
        className={cn(
          "md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-none",
          className,
        )}
      >
        {items.map((item, index) => (
          <div
            key={keyExtractor(item)}
            className="snap-start shrink-0 w-[85%] sm:w-[70%]"
          >
            <RevealOnScroll delay={index * staggerDelay} direction="left">
              {renderCard(item, index)}
            </RevealOnScroll>
          </div>
        ))}
      </div>

      {/* Desktop: grid layout */}
      <div className={cn("hidden gap-6", colsClass[desktopCols], className)}>
        {items.map((item, index) => (
          <RevealOnScroll
            key={keyExtractor(item)}
            delay={index * staggerDelay}
          >
            {renderCard(item, index)}
          </RevealOnScroll>
        ))}
      </div>
    </>
  );
}
