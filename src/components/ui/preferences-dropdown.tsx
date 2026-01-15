"use client";

import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BRAND } from "@/constants/brand";
import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  Globe,
  Instagram,
  Palette,
  Settings,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import * as React from "react";
import { Button } from "./button";

export function PreferencesDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const t = useTranslations("navigation");

  // Close dropdown when clicking outside
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

  // Handle keyboard navigation
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

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="text-muted-foreground hover:text-foreground relative group"
        aria-label={t("preferences.title")}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Settings className="h-4 w-4" />
        </motion.div>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 mt-3 w-72 rounded-2xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/30 z-50 overflow-hidden"
            role="menu"
          >
            {/* Header with gradient */}
            <div className="relative px-5 py-4 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent dark:from-primary/10 dark:via-primary/5 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("preferences.title")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("preferences.subtitle")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-1">
              {/* Language Section */}
              <div className="group rounded-xl p-3 hover:bg-accent/50 transition-colors duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-400/10 group-hover:bg-blue-500/15 transition-colors">
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">
                      {t("preferences.language")}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t("preferences.languageDescription")}
                    </p>
                  </div>
                </div>
                <div className="ml-11">
                  <LanguageSwitcher variant="desktop" />
                </div>
              </div>

              {/* Theme Section */}
              <div className="group rounded-xl p-3 hover:bg-accent/50 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-400/10 group-hover:bg-amber-500/15 transition-colors">
                    <Palette className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">
                      {t("preferences.appearance")}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t("preferences.appearanceDescription")}
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </div>

              {/* Divider */}
              <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Instagram Link */}
              <Link
                href={BRAND.instagram.mainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl p-3 hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-purple-500/10 transition-all duration-300"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 group-hover:from-pink-500/20 group-hover:to-purple-500/20 transition-colors">
                  <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    {t("preferences.followInstagram")}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {BRAND.instagram.main}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-pink-500 transition-colors" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
