"use client";

import useEmblaCarousel from "embla-carousel-react";
import { Children, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileCarouselProps {
  children: ReactNode;
  className?: string;
}

export function MobileCarousel({ children, className }: MobileCarouselProps) {
  const childArray = Children.toArray(children);
  const itemCount = childArray.length;
  const shouldLoop = itemCount >= 2;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: shouldLoop,
    align: "start",
    slidesToScroll: 1,
    containScroll: shouldLoop ? false : "trimSnaps",
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  if (itemCount === 0) {
    return null;
  }

  return (
    <>
      <section
        aria-roledescription="carousel"
        aria-label="Galeria de cards"
        className={cn("overflow-hidden", className)}
        ref={emblaRef}
        data-testid="mobile-carousel"
      >
        <div className="flex pl-4 gap-4">
          {childArray.map((child, index) => (
            <fieldset
              // biome-ignore lint/suspicious/noArrayIndexKey: slides are stable and not reordered
              key={index}
              aria-roledescription="slide"
              aria-label={`Item ${index + 1} de ${itemCount}`}
              className="min-w-0 shrink-0 w-[85%] sm:w-[70%] border-none p-0 m-0"
            >
              {child}
            </fieldset>
          ))}
          {shouldLoop && <div className="shrink-0 w-4" aria-hidden="true" />}
        </div>
      </section>
      <nav
        className="flex justify-center gap-1.5 pt-3"
        aria-label="Paginação do carrossel"
      >
        {childArray.map((_, index) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: slides are stable and not reordered
            key={index}
            type="button"
            aria-label={`Ir para o item ${index + 1} de ${itemCount}`}
            aria-current={index === selectedIndex ? "true" : undefined}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              index === selectedIndex ? "bg-primary" : "bg-muted-foreground/30",
            )}
            onClick={() => emblaApi?.scrollTo(index)}
          />
        ))}
      </nav>
    </>
  );
}
