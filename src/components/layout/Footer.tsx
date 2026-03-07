"use client";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/constants/brand";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { Calendar, Clock, Instagram, MapPin, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useTranslations("footer");
  const tBrand = useTranslations("brand");
  const locale = useLocale();
  const { bookingHref, shouldShowBooking, isExternal } = useBookingSettings();

  const bookingLinkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <footer className="border-t border-primary bg-card text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="Gold Mustache Logo"
                width={32}
                height={32}
                className="rounded-lg object-cover"
              />
              <div>
                <h3 className="font-playfair text-xl font-bold text-primary">
                  Gold Mustache
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tBrand("tagline")}
                </p>
              </div>
            </div>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("description")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                asChild
              >
                <Link
                  href={BRAND.instagram.mainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4" />
                  {t("links.barbershop")}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                asChild
              >
                <Link
                  href={BRAND.instagram.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4" />
                  {t("links.store")}
                </Link>
              </Button>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-primary">
              {t("sections.contact")}
            </h4>
            <div className="space-y-3 text-sm">
              <Link
                href={BRAND.contact.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-muted-foreground transition-colors hover:text-primary"
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{BRAND.contact.address}</span>
              </Link>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  {BRAND.contact.phone}
                </span>
              </div>
            </div>

            {shouldShowBooking && bookingHref && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2 border-primary/30 text-primary hover:bg-primary/10"
                asChild
              >
                <Link href={bookingHref} {...bookingLinkProps}>
                  <Calendar className="h-4 w-4" />
                  {t("links.book")}
                </Link>
              </Button>
            )}
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-primary">
              {t("hours.title")}
            </h4>
            <div className="space-y-2 font-mono text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span>{t("hours.weekdays")}</span>
                    <span className="text-foreground">
                      {t("hours.weekdaysTime")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>{t("hours.saturday")}</span>
                    <span className="text-foreground">
                      {t("hours.saturdayTime")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>{t("hours.sunday")}</span>
                    <span className="text-destructive">
                      {t("hours.sundayStatus")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
          <p>
            &copy; {currentYear} {t("copyright")}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/politica-de-privacidade`}
              className="transition-colors hover:text-primary"
            >
              {t("links.privacy")}
            </Link>
            <span className="text-border">|</span>
            <p>{tBrand("location")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
