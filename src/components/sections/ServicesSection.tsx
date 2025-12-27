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
import { SERVICES } from "@/constants/brand";
import { Calendar, Clock, Scissors, Star } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

const serviceIcons = {
  "corte-tradicional": Scissors,
  "corte-degrade": Scissors,
  "corte-barba": Scissors,
  "barba-completa": Scissors,
  bigode: Scissors,
  "sobrancelha-na-navalha": Scissors,
  "corte-americano": Scissors,
  "corte-low-fade": Scissors,
  "cera-nariz-ouvido": Scissors,
  "corte-degrade-tradicional": Scissors,
  "corte-degrade-na-zero": Scissors,
  "progressiva-relaxamento": Scissors,
  luzes: Scissors,
  platinado: Scissors,
  "sobrancelha-na-pinca": Scissors,
};

export function ServicesSection() {
  const t = useTranslations("services");
  const locale = useLocale();
  const bookingLink = `/${locale}/agendar`;

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
                  R$ 115,00
                </div>
                <div className="text-3xl font-bold text-primary">R$ 100,00</div>
                <Badge variant="destructive">{t("featured.save")} R$ 15</Badge>
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
              {SERVICES.map((service) => {
                const IconComponent =
                  serviceIcons[service.id as keyof typeof serviceIcons];

                return (
                  <CarouselItem
                    id={`servico-${service.id}`}
                    key={service.id}
                    className="pl-2 md:pl-4 basis-[85%] sm:basis-[70%]"
                  >
                    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                      <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <IconComponent className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-xl">
                          {t(`items.${service.id}.name`)}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {t(`items.${service.id}.description`)}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="text-center">
                        <Separator className="mb-4" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-2xl font-bold text-primary">
                              {service.price}
                            </span>
                          </div>
                          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{service.duration}</span>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter>
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
                            {t("labels.book")} {t(`items.${service.id}.name`)}
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service) => {
            const IconComponent =
              serviceIcons[service.id as keyof typeof serviceIcons];

            return (
              <Card
                id={`servico-${service.id}`}
                key={service.id}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary"
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    {t(`items.${service.id}.name`)}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {t(`items.${service.id}.description`)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                  <Separator className="mb-4" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl font-bold text-primary">
                        {service.price}
                      </span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{service.duration}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
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
                      {t("labels.book")} {t(`items.${service.id}.name`)}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
