"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RevealOnScroll } from "./RevealOnScroll";

interface SectionLayoutProps {
  id: string;
  icon?: LucideIcon;
  badge?: string;
  title: string;
  titleAccent?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

export function SectionLayout({
  id,
  icon: Icon,
  badge,
  title,
  titleAccent,
  description,
  children,
  className = "py-20 bg-background",
  headerClassName,
  ...ariaProps
}: SectionLayoutProps) {
  return (
    <section id={id} className={className} {...ariaProps}>
      <div className="container mx-auto px-4">
        <RevealOnScroll>
          <div className={headerClassName ?? "text-center mb-16"}>
            {badge && Icon && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-border text-sm text-muted-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{badge}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="hidden sm:block h-px w-12 bg-primary/40" />
              <h2
                id={ariaProps["aria-labelledby"]}
                className="text-3xl md:text-4xl font-playfair font-bold"
              >
                {title}
                {titleAccent && (
                  <span className="text-primary"> {titleAccent}</span>
                )}
              </h2>
              <div className="hidden sm:block h-px w-12 bg-primary/40" />
            </div>

            {description && (
              <p
                id={ariaProps["aria-describedby"]}
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
              >
                {description}
              </p>
            )}
          </div>
        </RevealOnScroll>

        {children}
      </div>
    </section>
  );
}
