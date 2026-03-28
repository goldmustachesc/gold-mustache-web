import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { MobileCarousel } from "./MobileCarousel";
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
  const slides = items.map((item, index) => (
    <div key={keyExtractor(item)}>{renderCard(item, index)}</div>
  ));

  return (
    <>
      {/* Mobile: carousel with loop and lateral padding */}
      <div className={cn("md:hidden", className)}>
        <MobileCarousel>{slides}</MobileCarousel>
      </div>

      {/* Desktop: grid layout */}
      <div className={cn("hidden gap-6", colsClass[desktopCols], className)}>
        {items.map((item, index) => (
          <RevealOnScroll key={keyExtractor(item)} delay={index * staggerDelay}>
            {renderCard(item, index)}
          </RevealOnScroll>
        ))}
      </div>
    </>
  );
}
