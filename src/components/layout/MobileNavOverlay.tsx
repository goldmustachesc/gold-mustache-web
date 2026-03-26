"use client";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSignOut, useUser } from "@/hooks/useAuth";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { Calendar, LogIn, LogOut, User, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

export type NavLink = {
  href: string;
  label: string;
};

interface MobileNavOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: NavLink[];
}

const STAGGER = 0.05;
const BASE_DELAY = 0.1;

function itemDelay(index: number): string {
  return `${BASE_DELAY + index * STAGGER}s`;
}

export function MobileNavOverlay({
  isOpen,
  onClose,
  navLinks,
}: MobileNavOverlayProps) {
  const t = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: user } = useUser();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { bookingHref, shouldShowBooking, isExternal } = useBookingSettings();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const bookingLinkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tCommon("aria.openMenu")}
      className="mobile-nav-overlay fixed inset-0 z-50 bg-background/98 backdrop-blur-md"
    >
      <div className="flex h-full flex-col px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Gold Mustache Logo"
              width={32}
              height={32}
              className="rounded-lg object-cover"
            />
            <span className="font-playfair text-lg font-bold text-primary">
              Gold Mustache
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={tCommon("aria.closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-12 flex flex-1 flex-col gap-1" aria-label="Main">
          {navLinks.map((link, index) => (
            <div
              key={link.href}
              className="mobile-nav-item"
              style={{ animationDelay: itemDelay(index) }}
            >
              <Link
                href={link.href}
                onClick={onClose}
                className="block rounded-lg px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                {link.label}
              </Link>
            </div>
          ))}

          <div
            className="mobile-nav-item mt-2 border-t border-border pt-4"
            style={{ animationDelay: itemDelay(navLinks.length) }}
          >
            <Link
              href={user ? `/${locale}/dashboard` : `/${locale}/login`}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {user ? (
                <User className="h-5 w-5" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              {user ? t("account") : t("login")}
            </Link>
          </div>

          {user && (
            <div
              className="mobile-nav-item"
              style={{ animationDelay: itemDelay(navLinks.length + 1) }}
            >
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signOutPending}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
                {signOutPending
                  ? tCommon("buttons.signingOut")
                  : tCommon("buttons.signOut")}
              </button>
            </div>
          )}
        </nav>

        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <LanguageSwitcher variant="mobile" />
            <ThemeToggle />
          </div>

          {shouldShowBooking && bookingHref && (
            <Button className="w-full gap-2 shadow-md" asChild>
              <Link href={bookingHref} onClick={onClose} {...bookingLinkProps}>
                <Calendar className="h-4 w-4" />
                {tCommon("buttons.bookAppointment")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
