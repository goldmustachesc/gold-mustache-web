import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { ResponsiveCardGrid } from "@/components/shared/ResponsiveCardGrid";
import { SectionLayout } from "@/components/shared/SectionLayout";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buildBookingHref, resolveBookingMode } from "@/lib/booking-mode";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import { getPublicServicesWithCache } from "@/services/booking";
import type { ServiceData } from "@/types/booking";
import { Clock, Scissors, Star } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ServiceBookingButton } from "./ServiceBookingButton";

const SERVICE_IMAGES: Record<string, string> = {
  "corte-americano": "/images/services/americano.webp",
  "corte-barba": "/images/services/corte-barba.webp",
  "corte-degrade-na-zero": "/images/services/degrade-na-zero.webp",
  "corte-degrade": "/images/services/degrade-navalhado.webp",
  "corte-low-fade": "/images/services/low-fade-navalhado.webp",
  luzes: "/images/services/luzes.webp",
  platinado: "/images/services/plantinado.webp",
  "corte-na-tesoura": "/images/services/tesoura.webp",
};

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

interface ServiceCardProps {
  service: ServiceData;
  bookingHref: string | null;
  shouldShowBooking: boolean;
  isExternal: boolean;
  bookLabel: string;
}

function ServiceCard({
  service,
  bookingHref,
  shouldShowBooking,
  isExternal,
  bookLabel,
}: ServiceCardProps) {
  const imageUrl = SERVICE_IMAGES[service.slug];

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 h-full flex flex-col overflow-hidden">
      {imageUrl ? (
        <div className="relative w-full h-40 md:h-48 overflow-hidden">
          <Image
            src={imageUrl}
            alt={service.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 85vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      ) : (
        <div className="w-full h-32 md:h-40 bg-primary/5 flex items-center justify-center">
          <Scissors className="h-12 w-12 md:h-16 md:w-16 text-primary/40" />
        </div>
      )}
      <CardHeader className="text-center pb-4 flex-shrink-0 pt-4">
        <CardTitle className="text-xl">{service.name}</CardTitle>
        <CardDescription className="text-base min-h-[3rem] flex items-center justify-center">
          {service.description || "\u00A0"}
        </CardDescription>
      </CardHeader>

      <CardContent className="text-center flex-grow flex flex-col justify-center">
        <Separator className="mb-4" />
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">
            {formatPrice(service.price)}
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{formatDuration(service.duration)}</span>
          </div>
        </div>
      </CardContent>

      {shouldShowBooking && bookingHref && (
        <CardFooter className="mt-auto">
          <ServiceBookingButton
            bookingHref={bookingHref}
            isExternal={isExternal}
            label={`${bookLabel} ${service.name}`}
          />
        </CardFooter>
      )}
    </Card>
  );
}

export async function ServicesSection() {
  const [locale, settings, services] = await Promise.all([
    getLocale(),
    getBarbershopSettings(),
    getPublicServicesWithCache(),
  ]);

  const t = await getTranslations({ locale, namespace: "services" });

  const mode = resolveBookingMode(settings);
  const bookingHref = buildBookingHref({
    mode,
    locale,
    externalBookingUrl: settings.externalBookingUrl,
  });
  const shouldShowBooking = mode !== "disabled" && !!bookingHref;
  const isExternal = mode === "external";

  const {
    featuredEnabled,
    featuredBadge,
    featuredTitle,
    featuredDescription,
    featuredDuration,
    featuredOriginalPrice,
    featuredDiscountedPrice,
  } = settings;
  const featuredSavings = featuredOriginalPrice - featuredDiscountedPrice;

  return (
    <SectionLayout
      id="servicos"
      icon={Scissors}
      badge={t("title")}
      title={t("subtitle")}
      description={t("description")}
      className="py-20 bg-muted/30"
    >
      {featuredEnabled && (
        <RevealOnScroll delay={0.1}>
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <CardHeader className="text-center pb-4">
                <Badge variant="default" className="mb-2 w-fit mx-auto">
                  <Star className="h-4 w-4 mr-2" />
                  {featuredBadge}
                </Badge>
                <CardTitle className="text-2xl md:text-3xl">
                  {featuredTitle}
                </CardTitle>
                <CardDescription className="text-lg">
                  {featuredDescription}
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-2 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
                  <span className="text-base text-muted-foreground line-through sm:text-lg">
                    {formatPrice(featuredOriginalPrice)}
                  </span>
                  <span className="text-3xl font-bold text-primary sm:text-4xl">
                    {formatPrice(featuredDiscountedPrice)}
                  </span>
                </div>
                <Badge variant="destructive" className="mb-4">
                  {t("featured.save")} {formatPrice(featuredSavings)}
                </Badge>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{featuredDuration}</span>
                </div>
              </CardContent>

              {shouldShowBooking && bookingHref && (
                <CardFooter className="flex flex-col sm:flex-row gap-4">
                  <ServiceBookingButton
                    bookingHref={bookingHref}
                    isExternal={isExternal}
                    label={t("featured.cta")}
                    className="max-w-xs mx-auto"
                  />
                </CardFooter>
              )}
            </Card>
          </div>
        </RevealOnScroll>
      )}

      {services.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t("empty")}</p>
        </div>
      )}

      {services.length > 0 && (
        <ResponsiveCardGrid
          items={services}
          keyExtractor={(s) => s.id}
          desktopCols={3}
          renderCard={(service) => (
            <ServiceCard
              service={service}
              bookingHref={bookingHref}
              shouldShowBooking={shouldShowBooking}
              isExternal={isExternal}
              bookLabel={t("labels.book")}
            />
          )}
        />
      )}
    </SectionLayout>
  );
}
