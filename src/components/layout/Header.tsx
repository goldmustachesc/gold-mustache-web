"use client";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { PreferencesDropdown } from "@/components/ui/preferences-dropdown";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BRAND } from "@/constants/brand";
import { useScrollPosition } from "@/hooks/useScrollPosition";

import {
  Calendar,
  CalendarCheck2,
  Instagram,
  LogIn,
  Menu,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

import { useUser } from "@/hooks/useAuth";
import { useState } from "react";

type NavLink = {
  href: string;
  label: string;
};

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { isScrolledPastThreshold } = useScrollPosition(300);
  const t = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: user } = useUser();

  // Helper to create proper links that work from any page
  const homeLink = `/${locale}`;
  const sectionLink = (section: string) => `/${locale}#${section}`;
  const bookingLink = `/${locale}/agendar`;
  const myAppointmentsLink = `/${locale}/meus-agendamentos`;

  const navLinks: NavLink[] = [
    { href: homeLink, label: t("home") },
    { href: sectionLink("servicos"), label: t("services") },
    { href: sectionLink("equipe"), label: t("team") },
    { href: `/${locale}/blog`, label: t("blog") },
    { href: sectionLink("eventos"), label: t("events") },
    { href: sectionLink("contato"), label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/80">
      <div className="container flex h-14 lg:h-16 items-center justify-between px-4 m-auto">
        {/* Logo */}
        <Link
          href={homeLink}
          className="flex items-center gap-2.5 text-lg lg:text-xl font-bold text-primary hover:text-primary/90 transition-colors"
        >
          <div className="h-8 w-8 flex items-center justify-center bg-muted dark:bg-zinc-800 rounded-lg p-1">
            <Image
              src="/logo.png"
              alt="Gold Mustache Logo"
              width={28}
              height={28}
              className="rounded-md object-cover"
            />
          </div>
          <span className="font-playfair hidden min-[400px]:inline">
            Gold Mustache
          </span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-1">
            {navLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <Link
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2">
          <PreferencesDropdown />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-muted dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
            asChild
          >
            <Link href={myAppointmentsLink} aria-label={t("myAppointments")}>
              <CalendarCheck2 className="h-4 w-4" />
              <span>{t("myAppointments")}</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-muted dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
            asChild
          >
            <Link
              href={user ? `/${locale}/dashboard` : `/${locale}/login`}
              aria-label={user ? "Dashboard" : "Login"}
            >
              {user ? (
                <>
                  <User className="h-4 w-4" />
                  <span>{t("account")}</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{t("login")}</span>
                </>
              )}
            </Link>
          </Button>
          {!isScrolledPastThreshold && (
            <Button
              size="sm"
              className="ml-1 flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg"
              asChild
            >
              <Link href={bookingLink} aria-label={tCommon("buttons.book")}>
                <Calendar className="h-4 w-4" />
                <span>{tCommon("buttons.book")}</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden flex items-center gap-2">
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md text-xs px-3"
            asChild
          >
            <Link
              href={myAppointmentsLink}
              className="flex items-center gap-1.5"
              aria-label={t("myAppointments")}
            >
              <CalendarCheck2 className="h-4 w-4" />
              <span className="font-medium hidden min-[360px]:inline">
                {t("myAppointments")}
              </span>
            </Link>
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 px-2"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{tCommon("aria.openMenu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 bg-background dark:bg-zinc-900 border-border dark:border-zinc-800"
            >
              <div className="flex flex-col space-y-6 mt-6 px-2">
                {/* Mobile Logo */}
                <div className="flex items-center gap-3 text-lg font-bold text-primary">
                  <div className="h-10 w-10 flex items-center justify-center bg-muted dark:bg-zinc-800 rounded-xl p-1.5">
                    <Image
                      src="/logo.png"
                      alt="Gold Mustache Logo"
                      width={32}
                      height={32}
                      className="rounded-lg object-cover"
                    />
                  </div>
                  <span className="font-playfair">Gold Mustache</span>
                </div>

                {/* Preferences - Mobile */}
                <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-zinc-800/50 rounded-xl">
                  <LanguageSwitcher variant="mobile" />
                  <ThemeToggle />
                </div>

                {/* Mobile Navigation */}
                <nav className="flex flex-col space-y-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-base font-medium text-foreground hover:text-primary hover:bg-muted/50 dark:text-zinc-300 dark:hover:bg-zinc-800/50 px-3 py-2.5 rounded-lg transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Actions */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-border dark:border-zinc-800">
                  <Button
                    variant="outline"
                    asChild
                    className="w-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary hover:border-primary/50"
                  >
                    <Link
                      href={myAppointmentsLink}
                      className="flex items-center justify-center gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <CalendarCheck2 className="h-4 w-4" />
                      <span>{t("myAppointments")}</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="w-full border-border text-foreground hover:bg-muted dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <Link
                      href={user ? `/${locale}/dashboard` : `/${locale}/login`}
                      className="flex items-center justify-center gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      {user ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <LogIn className="h-4 w-4" />
                      )}
                      <span>{user ? "Minha Conta" : "Entrar"}</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="w-full border-border text-foreground hover:bg-muted dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <Link
                      href={BRAND.instagram.mainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>{tCommon("buttons.follow")}</span>
                    </Link>
                  </Button>
                  <Button
                    className="w-full flex items-center justify-center gap-2 shadow-md"
                    asChild
                  >
                    <Link
                      href={bookingLink}
                      className="flex items-center justify-center gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>{tCommon("buttons.bookAppointment")}</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
