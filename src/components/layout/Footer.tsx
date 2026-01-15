"use client";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/constants/brand";
import { Calendar, Clock, Instagram, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useTranslations("footer");
  const tBrand = useTranslations("brand");
  const locale = useLocale();
  const bookingLink = `/${locale}/agendar`;

  return (
    <footer className="bg-zinc-100 dark:bg-zinc-900 text-foreground dark:text-zinc-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Gold Mustache Logo"
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary font-playfair">
                  Gold Mustache
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {tBrand("tagline")}
                </p>
              </div>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md">
              {t("description")}
            </p>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={BRAND.instagram.mainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 border-zinc-300 dark:border-primary/30 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                >
                  <Instagram className="h-4 w-4" />
                  <span>{t("links.barbershop")}</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={BRAND.instagram.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 border-zinc-300 dark:border-primary/30 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                >
                  <Instagram className="h-4 w-4" />
                  <span>{t("links.store")}</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-primary">
              {t("sections.contact")}
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {BRAND.contact.address}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {BRAND.contact.phone}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="text-zinc-600 dark:text-zinc-400">
                  <div>Segunda a Sexta: 10h às 20h</div>
                  <div>Sábado: 10h às 20h</div>
                  <div>Domingo: Fechado</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-primary">
              {t("sections.quickLinks")}
            </h4>
            <div className="space-y-3 text-sm">
              <Link
                href="#servicos"
                className="block text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors"
              >
                {t("links.services")}
              </Link>
              <Link
                href="#instagram"
                className="block text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors"
              >
                {t("links.instagram")}
              </Link>
              <Link
                href="#contato"
                className="block text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors"
              >
                {t("links.contact")}
              </Link>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary hover:text-primary/80 text-sm font-normal"
                asChild
              >
                <Link href={bookingLink} className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("links.book")}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            © {currentYear} {t("copyright")}
          </p>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <Link
              href={`/${locale}/politica-de-privacidade`}
              className="hover:text-primary transition-colors"
            >
              {t("links.privacy")}
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <p>{tBrand("location")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
