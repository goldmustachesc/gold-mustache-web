"use client";

import { GoogleMap } from "@/components/custom/GoogleMap";
import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { SectionLayout } from "@/components/shared/SectionLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BRAND } from "@/constants/brand";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import {
  Calendar,
  Clock,
  Instagram,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

function openWhatsApp(whatsapp: string, message: string) {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${whatsapp}?text=${encoded}`, "_blank");
}

interface ContactPerson {
  titleKey: string;
  phone: string;
  whatsapp: string;
}

const CONTACTS: ContactPerson[] = [
  {
    titleKey: "phone.ownerYgor",
    phone: BRAND.contact.phone,
    whatsapp: BRAND.contact.whatsapp,
  },
  {
    titleKey: "phone.ownerVitor",
    phone: BRAND.contactVitor.phone,
    whatsapp: BRAND.contactVitor.whatsapp,
  },
  {
    titleKey: "phone.barberJoao",
    phone: BRAND.contactJoao.phone,
    whatsapp: BRAND.contactJoao.whatsapp,
  },
  {
    titleKey: "phone.barberDavid",
    phone: BRAND.contactDavid.phone,
    whatsapp: BRAND.contactDavid.whatsapp,
  },
];

export function ContactSection() {
  const t = useTranslations("contact");
  const { bookingHref, shouldShowBooking, isExternal } = useBookingSettings();
  const bookingLinkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  const whatsappMessage = t("whatsappMessage");

  return (
    <SectionLayout
      id="contato"
      icon={MapPin}
      badge={t("title")}
      title={t("subtitle")}
      description={t("description")}
      className="py-20 bg-muted/30"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="space-y-6">
          <RevealOnScroll delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>{t("address.title")}</span>
                </CardTitle>
                <CardDescription>{t("address.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground font-medium">
                  {BRAND.contact.address}
                </p>
                <Button
                  onClick={() =>
                    window.open(BRAND.contact.googleMapsUrl, "_blank")
                  }
                  variant="default"
                  className="w-full cursor-pointer"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {t("address.cta")}
                </Button>
              </CardContent>
            </Card>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{t("hours.title")}</span>
                </CardTitle>
                <CardDescription>{t("hours.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("hours.weekdays")}
                  </span>
                  <span className="font-medium">{t("hours.time")}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("hours.saturday")}
                  </span>
                  <span className="font-medium">{t("hours.time")}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("hours.sunday")}
                  </span>
                  <span className="font-medium text-destructive">
                    {t("hours.closed")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </RevealOnScroll>

          <RevealOnScroll delay={0.2}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CONTACTS.map((contact) => (
                <Card key={contact.titleKey}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{t(contact.titleKey)}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t("phone.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t("phone.label")}
                      </p>
                      <p className="font-medium text-sm">{contact.phone}</p>
                    </div>
                    <Button
                      onClick={() =>
                        openWhatsApp(contact.whatsapp, whatsappMessage)
                      }
                      className="w-full cursor-pointer"
                      variant="default"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t("phone.cta")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RevealOnScroll>
        </div>

        <div className="space-y-6">
          <RevealOnScroll delay={0.15} direction="right">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-[4/3]">
                  <GoogleMap />
                </div>
              </CardContent>
            </Card>
          </RevealOnScroll>

          {shouldShowBooking && bookingHref && (
            <RevealOnScroll delay={0.2} direction="right">
              <Button size="lg" className="h-auto py-4 w-full" asChild>
                <Link
                  href={bookingHref}
                  className="flex items-center"
                  {...bookingLinkProps}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">{t("cta.book")}</div>
                    <div className="text-xs opacity-90">
                      {t("cta.bookDescription")}
                    </div>
                  </div>
                </Link>
              </Button>
            </RevealOnScroll>
          )}

          <RevealOnScroll delay={0.25} direction="right">
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">
                  {t("instagram.title")}
                </CardTitle>
                <CardDescription>{t("instagram.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <Button asChild variant="default" className="cursor-pointer">
                    <a
                      href={BRAND.instagram.mainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>@goldmustachebarbearia</span>
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="default"
                    className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <a
                      href={BRAND.instagram.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>@_goldlab</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </RevealOnScroll>
        </div>
      </div>
    </SectionLayout>
  );
}
