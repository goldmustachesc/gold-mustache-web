"use client";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useUser } from "@/hooks/useAuth";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Calendar, LogIn, Menu, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MobileNavOverlay, type NavLink } from "./MobileNavOverlay";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isScrolledPastThreshold } = useScrollPosition(300);
  const t = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: user } = useUser();
  const { bookingHref, shouldShowBooking, isExternal, isInternal } =
    useBookingSettings();

  const bookingLinkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  const homeLink = `/${locale}`;

  const navLinks: NavLink[] = [
    { href: homeLink, label: t("home") },
    { href: `/${locale}#servicos`, label: t("services") },
    { href: `/${locale}#equipe`, label: t("team") },
    { href: `/${locale}/blog`, label: t("blog") },
    ...(isInternal
      ? [
          {
            href: `/${locale}/meus-agendamentos`,
            label: t("myAppointments"),
          },
        ]
      : []),
    { href: `/${locale}#eventos`, label: t("events") },
    { href: `/${locale}#contato`, label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="h-0.5 bg-primary" data-accent-line aria-hidden="true" />

      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 lg:h-16">
          <Link
            href={homeLink}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="Gold Mustache Logo"
              width={28}
              height={28}
              className="rounded-md object-cover"
            />
            <span className="font-playfair text-lg font-bold text-primary hidden xs:inline">
              Gold Mustache
            </span>
          </Link>

          <nav className="hidden lg:flex" aria-label="Main navigation">
            <ul className="flex items-center gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {link.label}
                    <span className="absolute inset-x-3 -bottom-px h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-200 ease-out group-hover:scale-x-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />

            <Link
              href={user ? `/${locale}/dashboard` : `/${locale}/login`}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {user ? (
                <>
                  <User className="h-4 w-4" />
                  {t("account")}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {t("login")}
                </>
              )}
            </Link>

            {!isScrolledPastThreshold && shouldShowBooking && bookingHref && (
              <Button size="sm" className="ml-1 gap-2 shadow-md" asChild>
                <Link href={bookingHref} {...bookingLinkProps}>
                  <Calendar className="h-4 w-4" />
                  {tCommon("buttons.book")}
                </Link>
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label={tCommon("aria.openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <MobileNavOverlay
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navLinks={navLinks}
      />
    </header>
  );
}
