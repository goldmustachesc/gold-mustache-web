"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { BRAND } from "@/constants/brand";
import { useServices } from "@/hooks/useBooking";
import { Calendar, Clock, Scissors, Star, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

// Mapeamento de slug do serviço para imagem WebP
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
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export function ServicesSection() {
  const t = useTranslations("services");
  const locale = useLocale();
  const bookingLink = `/${locale}/agendar`;

  // Fetch services from database (public API, only active services)
  const { data: services = [], isLoading, isError } = useServices();

  // Featured combo prices from brand constants
  const { originalPrice, discountedPrice } = BRAND.featuredCombo;
  const featuredSavings = originalPrice - discountedPrice;

  return (
    <section id="servicos" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Scissors className="h-4 w-4 mr-2" />
            {t("title")}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("subtitle")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Featured Combo */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="text-center pb-4">
              <Badge variant="default" className="mb-2 w-fit mx-auto">
                <Star className="h-4 w-4 mr-2" />
                {t("featured.badge")}
              </Badge>
              <CardTitle className="text-2xl md:text-3xl">
                {t("featured.title")}
              </CardTitle>
              <CardDescription className="text-lg">
                {t("featured.description")}
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="text-lg text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </div>
                <div className="text-3xl font-bold text-primary">
                  {formatPrice(discountedPrice)}
                </div>
                <Badge variant="destructive">
                  {t("featured.save")} {formatPrice(featuredSavings)}
                </Badge>
              </div>
              <div className="flex items-center justify-center space-x-2 text-muted-foreground mb-6">
                <Clock className="h-4 w-4" />
                <span>{t("featured.duration")}</span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-4">
              <Button
                size="default"
                className="w-full max-w-xs mx-auto cursor-pointer"
                asChild
              >
                <Link href={bookingLink} className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  {t("featured.cta")}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">{t("loading")}</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t("error.title")}</p>
            <p className="text-sm mt-2">{t("error.message")}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && services.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t("empty")}</p>
          </div>
        )}

        {/* Services List */}
        {!isLoading && !isError && services.length > 0 && (
          <>
            {/* Mobile Carousel */}
            <div className="md:hidden">
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {services.map((service) => (
                    <CarouselItem
                      id={`servico-${service.slug}`}
                      key={service.id}
                      className="pl-2 md:pl-4 basis-[85%] sm:basis-[70%]"
                    >
                      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col overflow-hidden">
                        {/* Service Image */}
                        {SERVICE_IMAGES[service.slug] ? (
                          <div className="relative w-full h-40 overflow-hidden">
                            <Image
                              src={SERVICE_IMAGES[service.slug]}
                              alt={service.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 640px) 85vw, 70vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-primary/5 flex items-center justify-center">
                            <Scissors className="h-12 w-12 text-primary/40" />
                          </div>
                        )}
                        <CardHeader className="text-center pb-4 flex-shrink-0 pt-4">
                          <CardTitle className="text-xl">
                            {service.name}
                          </CardTitle>
                          <CardDescription className="text-base min-h-[3rem] flex items-center justify-center">
                            {service.description || "\u00A0"}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="text-center flex-grow flex flex-col justify-center">
                          <Separator className="mb-4" />
                          <div className="space-y-2">
                            <div className="flex items-center justify-center space-x-2">
                              <span className="text-2xl font-bold text-primary">
                                {formatPrice(service.price)}
                              </span>
                            </div>
                            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">
                                {formatDuration(service.duration)}
                              </span>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="mt-auto">
                          <Button
                            className="w-full cursor-pointer"
                            variant="default"
                            asChild
                          >
                            <Link
                              href={bookingLink}
                              className="flex items-center justify-center"
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              {t("labels.book")} {service.name}
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card
                  id={`servico-${service.slug}`}
                  key={service.id}
                  className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary h-full flex flex-col overflow-hidden"
                >
                  {/* Service Image */}
                  {SERVICE_IMAGES[service.slug] ? (
                    <div className="relative w-full h-48 overflow-hidden">
                      <Image
                        src={SERVICE_IMAGES[service.slug]}
                        alt={service.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-primary/5 flex items-center justify-center">
                      <Scissors className="h-16 w-16 text-primary/40" />
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
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(service.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">
                          {formatDuration(service.duration)}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="mt-auto">
                    <Button
                      className="w-full cursor-pointer"
                      variant="default"
                      asChild
                    >
                      <Link
                        href={bookingLink}
                        className="flex items-center justify-center"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {t("labels.book")} {service.name}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
