"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import * as React from "react";
import { cn } from "@/lib/utils";

type ThemeValue = "system" | "light" | "dark";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = useTranslations("common");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (theme ?? "system") as ThemeValue;

  const options: { value: ThemeValue; icon: React.ElementType; label: string }[] =
    [
      { value: "system", icon: Monitor, label: t("theme.system") },
      { value: "light", icon: Sun, label: t("theme.light") },
      { value: "dark", icon: Moon, label: t("theme.dark") },
    ];

  if (!mounted) {
    return (
      <div
        className="flex h-9 w-[7.5rem] rounded-lg border border-border bg-muted/50 p-0.5"
        aria-hidden
      >
        <div className="flex flex-1 items-center justify-center gap-0.5 rounded-md bg-muted">
          <span className="sr-only">{t("theme.label")}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("theme.label")}
      className="flex h-9 w-[7.5rem] rounded-lg border border-border bg-muted/50 p-0.5"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const isActive = currentTheme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(value)}
            aria-label={label}
            className={cn(
              "flex flex-1 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background hover:text-foreground",
              isActive &&
                "bg-background text-foreground shadow-sm hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
