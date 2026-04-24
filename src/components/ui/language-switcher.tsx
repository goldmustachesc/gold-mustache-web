"use client";

import { localeNames, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

interface LanguageSwitcherProps {
  variant?: "desktop" | "mobile";
}

export function LanguageSwitcher({
  variant = "desktop",
}: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    try {
      localStorage.setItem("preferred-locale", newLocale);
    } catch (error) {
      console.warn("Failed to save locale preference:", error);
    }

    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPathname);
    setIsOpen(false);
  };

  if (!mounted) {
    return (
      <div className={variant === "desktop" ? "h-8 w-20" : "h-11 w-full"}>
        <div className="flex items-center justify-center h-full">
          <Languages className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const currentLocaleData = localeNames[currentLocale];

  if (variant === "mobile") {
    return (
      <div className="w-full" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-lg font-medium hover:text-primary transition-colors rounded-lg hover:bg-accent"
          aria-label={t("changeLanguage")}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <div className="flex items-center space-x-3">
            <Languages className="h-5 w-5" />
            <span>
              {currentLocaleData.flag} {currentLocaleData.native}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>

        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
            isOpen
              ? "max-h-[min(24rem,70vh)] opacity-100"
              : "max-h-0 opacity-0",
          )}
          role="menu"
          aria-hidden={!isOpen}
        >
          <div className="py-2 space-y-1">
            {locales.map((locale) => {
              const localeData = localeNames[locale];
              const isActive = locale === currentLocale;

              return (
                <button
                  key={locale}
                  type="button"
                  onClick={() => handleLocaleChange(locale)}
                  className={cn(
                    "w-full flex items-center justify-between px-8 py-2 text-base transition-colors rounded-lg",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                  role="menuitem"
                  aria-current={isActive ? "true" : undefined}
                >
                  <span>
                    {localeData.flag} {localeData.native}
                  </span>
                  {isActive && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 h-8 px-3 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-2"
        aria-label={t("changeLanguage")}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="text-sm font-medium">
          {currentLocaleData.flag} {currentLocale.split("-")[0].toUpperCase()}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          className="lang-dropdown-panel absolute right-0 mt-2 w-48 rounded-lg border bg-popover shadow-lg z-50"
          role="menu"
        >
          <div className="py-1">
            {locales.map((locale) => {
              const localeData = localeNames[locale];
              const isActive = locale === currentLocale;

              return (
                <button
                  key={locale}
                  type="button"
                  onClick={() => handleLocaleChange(locale)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 text-sm transition-colors",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:bg-accent",
                  )}
                  role="menuitem"
                  aria-current={isActive ? "true" : undefined}
                >
                  <span>
                    {localeData.flag} {localeData.native}
                  </span>
                  {isActive && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
