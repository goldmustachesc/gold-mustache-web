"use client";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
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
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 m-auto">
        <Link
          href={homeLink}
          className="flex items-center space-x-3 text-xl font-bold text-primary hover:text-primary/90 transition-colors"
        >
          <div className="h-8 w-8 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Gold Mustache Logo"
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          </div>
          <span className="font-playfair">Gold Mustache</span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-0.5">
            {navLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <Link
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-1">
          <LanguageSwitcher variant="desktop" />
          <div className="w-px h-4 bg-border mx-1" />
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            className="ml-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
            asChild
          >
            <Link
              href={myAppointmentsLink}
              className="flex items-center gap-2"
              aria-label={t("myAppointments")}
            >
              <CalendarCheck2 className="h-4 w-4" />
              <span>{t("myAppointments")}</span>
              <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link
              href={BRAND.instagram.mainUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link
              href={user ? `/${locale}/dashboard` : `/${locale}/login`}
              aria-label={user ? "Dashboard" : "Login"}
            >
              {user ? (
                <User className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
            </Link>
          </Button>
          {!isScrolledPastThreshold && (
            <Button
              size="sm"
              className="ml-2 flex items-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md"
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
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
            asChild
          >
            <Link
              href={myAppointmentsLink}
              className="flex items-center gap-2"
              aria-label={t("myAppointments")}
            >
              <CalendarCheck2 className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">
                {t("myAppointments")}
              </span>
              <span className="sr-only">{t("myAppointments")}</span>
              <span className="ml-0.5 h-2 w-2 rounded-full bg-primary" />
            </Link>
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{tCommon("aria.openMenu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col space-y-6 mt-6 pl-4 pr-4">
                {/* Mobile Logo */}
                <div className="flex items-center space-x-3 text-lg font-bold text-primary">
                  <div className="h-8 w-8 flex items-center justify-center">
                    <Image
                      src="/logo.png"
                      alt="Gold Mustache Logo"
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <span className="font-playfair">Gold Mustache</span>
                </div>

                {/* Language Switcher - Mobile */}
                <LanguageSwitcher variant="mobile" />

                {/* Mobile Navigation */}
                <nav className="flex flex-col space-y-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Actions */}
                <div className="flex flex-col space-y-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    asChild
                    className="w-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                  >
                    <Link
                      href={myAppointmentsLink}
                      className="flex items-center justify-center space-x-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <CalendarCheck2 className="h-4 w-4" />
                      <span>{t("myAppointments")}</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link
                      href={user ? `/${locale}/dashboard` : `/${locale}/login`}
                      className="flex items-center justify-center space-x-2"
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
                  <Button variant="outline" asChild className="w-full">
                    <Link
                      href={BRAND.instagram.mainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>{tCommon("buttons.follow")}</span>
                    </Link>
                  </Button>
                  <Button
                    className="w-full flex items-center justify-center space-x-2"
                    asChild
                  >
                    <Link
                      href={bookingLink}
                      className="flex items-center justify-center space-x-2"
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
