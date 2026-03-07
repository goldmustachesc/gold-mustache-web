"use client";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSignOut, useUser } from "@/hooks/useAuth";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { AnimatePresence, motion } from "framer-motion";
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={tCommon("aria.openMenu")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-background/98 backdrop-blur-md"
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

            <motion.nav
              initial="closed"
              animate="open"
              variants={{
                open: {
                  transition: { staggerChildren: 0.05, delayChildren: 0.1 },
                },
                closed: {},
              }}
              className="mt-12 flex flex-1 flex-col gap-1"
            >
              {navLinks.map((link) => (
                <motion.div
                  key={link.href}
                  variants={{
                    closed: { opacity: 0, y: 16 },
                    open: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="block rounded-lg px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                variants={{
                  closed: { opacity: 0, y: 16 },
                  open: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="mt-2 border-t border-border pt-4"
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
              </motion.div>

              {user && (
                <motion.div
                  variants={{
                    closed: { opacity: 0, y: 16 },
                    open: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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
                </motion.div>
              )}
            </motion.nav>

            <div className="space-y-4 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <LanguageSwitcher variant="mobile" />
                <ThemeToggle />
              </div>

              {shouldShowBooking && bookingHref && (
                <Button className="w-full gap-2 shadow-md" asChild>
                  <Link
                    href={bookingHref}
                    onClick={onClose}
                    {...bookingLinkProps}
                  >
                    <Calendar className="h-4 w-4" />
                    {tCommon("buttons.bookAppointment")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
