import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface BrandWordmarkProps {
  className?: string;
  children?: ReactNode;
}

export function BrandWordmark({
  className,
  children = "GOLD MUSTACHE",
}: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "font-playfair font-bold tracking-wider text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
