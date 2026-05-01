"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PencilLine } from "lucide-react";

export interface BookingProgressSummaryItem {
  id: string;
  label: string;
  value: string | null;
  placeholder: string;
  onEdit?: () => void;
  editLabel?: string;
}

interface BookingProgressSummaryProps {
  title?: string;
  items: BookingProgressSummaryItem[];
  className?: string;
  variant?: "default" | "horizontal-sticky";
}

export function BookingProgressSummary({
  title = "Resumo do agendamento",
  items,
  className,
  variant = "default",
}: BookingProgressSummaryProps) {
  return (
    <section className={cn("space-y-3", className)} aria-label={title}>
      {variant === "default" && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {items.map((item) => {
          const hasValue = Boolean(item.value);

          return (
            <div
              key={item.id}
              className="rounded-xl bg-background/60 px-3 py-2.5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-sm font-medium leading-snug",
                      hasValue ? "text-foreground" : "text-muted-foreground/80",
                    )}
                  >
                    {item.value ?? item.placeholder}
                  </p>
                </div>
                {item.onEdit && hasValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label={item.editLabel ?? `Editar ${item.label}`}
                    onClick={item.onEdit}
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
