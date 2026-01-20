"use client";

import { GoogleMap } from "@/components/custom/GoogleMap";
import { Badge } from "@/components/ui/badge";
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
import { useLocale, useTranslations } from "next-intl";

export function ContactSection() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const bookingLink = `/${locale}/agendar`;

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(t("whatsappMessage"));
    window.open(
      `https://wa.me/${BRAND.contact.whatsapp}?text=${message}`,
      "_blank",
    );
  };

  const handleWhatsAppVitorClick = () => {
    const message = encodeURIComponent(t("whatsappMessage"));
    window.open(
      `https://wa.me/${BRAND.contactVitor.whatsapp}?text=${message}`,
      "_blank",
    );
  };

  const handleWhatsAppJoaoClick = () => {
    const message = encodeURIComponent(t("whatsappMessage"));
    window.open(
      `https://wa.me/${BRAND.contactJoao.whatsapp}?text=${message}`,
      "_blank",
    );
  };

  const handleWhatsAppDavidClick = () => {
    const message = encodeURIComponent(t("whatsappMessage"));
    window.open(
      `https://wa.me/${BRAND.contactDavid.whatsapp}?text=${message}`,
      "_blank",
    );
  };

  const handleDirectionsClick = () => {
    window.open(BRAND.contact.googleMapsUrl, "_blank");
  };

  return (
    <section className="py-20 bg-muted/30" id="contato">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{t("title")}</span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-playfair font-bold mb-4">
            {t("subtitle")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Informações de Contato */}
          <div className="space-y-6">
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
                  onClick={handleDirectionsClick}
                  variant="default"
                  className="w-full cursor-pointer"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {t("address.cta")}
                </Button>
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>{t("phone.ownerYgor")}</span>
                </CardTitle>
                <CardDescription>{t("phone.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground">{t("phone.label")}</p>
                  <p className="font-medium">{BRAND.contact.phone}</p>
                </div>
                <Button
                  onClick={handleWhatsAppClick}
                  className="w-full cursor-pointer"
                  variant="default"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t("phone.cta")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>{t("phone.ownerVitor")}</span>
                </CardTitle>
                <CardDescription>{t("phone.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground">{t("phone.label")}</p>
                  <p className="font-medium">{BRAND.contactVitor.phone}</p>
                </div>
                <Button
                  onClick={handleWhatsAppVitorClick}
                  className="w-full cursor-pointer"
                  variant="default"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t("phone.cta")}
                </Button>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-primary" />
                    <span>{t("phone.barberJoao")}</span>
                  </CardTitle>
                  <CardDescription>{t("phone.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">{t("phone.label")}</p>
                    <p className="font-medium">{BRAND.contactJoao.phone}</p>
                  </div>
                  <Button
                    onClick={handleWhatsAppJoaoClick}
                    className="w-full cursor-pointer"
                    variant="default"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t("phone.cta")}
                  </Button>
                </CardContent>
              </Card>

              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-primary" />
                    <span>{t("phone.barberDavid")}</span>
                  </CardTitle>
                  <CardDescription>{t("phone.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">{t("phone.label")}</p>
                    <p className="font-medium">{BRAND.contactDavid.phone}</p>
                  </div>
                  <Button
                    onClick={handleWhatsAppDavidClick}
                    className="w-full cursor-pointer"
                    variant="default"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t("phone.cta")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mapa do Google e Ações */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-[4/3]">
                  <GoogleMap />
                </div>
              </CardContent>
            </Card>

            {/* Call to Actions */}
            <div className="flex w-full">
              <Button size="lg" className="h-auto py-4 w-full" asChild>
                <Link href={bookingLink} className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">{t("cta.book")}</div>
                    <div className="text-xs opacity-90">
                      {t("cta.bookDescription")}
                    </div>
                  </div>
                </Link>
              </Button>

              {/* <Button
                onClick={handleWhatsAppClick}
                variant="outline"
                size="lg"
                className="h-auto py-4"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">
                    WhatsApp Ygor (proprietário)
                  </div>
                  <div className="text-xs opacity-90">Contato Direto</div>
                </div>
              </Button> */}
            </div>

            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">
                  {t("instagram.title")}
                </CardTitle>
                <CardDescription>{t("instagram.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="cursor-pointer"
                  >
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
                    size="sm"
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
          </div>
        </div>

        {/* Emergency Contact */}
        {/* <div className="text-center">
          <Card className="max-w-lg mx-auto bg-secondary text-secondary-foreground">
            <CardContent className="py-6">
              <h3 className="font-semibold mb-2">Emergência ou Dúvidas?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Entre em contato conosco via WhatsApp para atendimento rápido
              </p>
              <Button onClick={handleWhatsAppClick} size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Falar Agora
              </Button>
            </CardContent>
          </Card>
        </div> */}
      </div>
    </section>
  );
}
