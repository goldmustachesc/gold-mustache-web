"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { cn } from "@/lib/utils";

type ThemeValue = "system" | "light" | "dark";

const OPTIONS: { value: ThemeValue; icon: React.ElementType; label: string }[] =
  [
    { value: "system", icon: Monitor, label: "Seguir tema do sistema" },
    { value: "light", icon: Sun, label: "Tema claro" },
    { value: "dark", icon: Moon, label: "Tema escuro" },
  ];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (theme ?? "system") as ThemeValue;

  if (!mounted) {
    return (
      <div
        className="flex h-9 w-[7.5rem] rounded-lg border border-border bg-muted/50 p-0.5"
        aria-hidden
      >
        <div className="flex flex-1 items-center justify-center gap-0.5 rounded-md bg-muted">
          <span className="sr-only">Tema</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="flex h-9 w-[7.5rem] rounded-lg border border-border bg-muted/50 p-0.5"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const isActive = currentTheme === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: Custom radio implementation using button
          <button
            key={value}
            type="button"
            role="radio"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-checked={isActive}
            className={cn(
              "flex flex-1 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background hover:text-foreground",
              isActive &&
                "bg-background text-foreground shadow-sm hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
