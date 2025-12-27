"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations("hero");
  const tBrand = useTranslations("brand");
  const locale = useLocale();
  const bookingLink = `/${locale}/agendar`;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-muted/10 to-muted/20" />

      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="default" className="text-sm px-4 py-2">
              <MapPin className="h-4 w-4 mr-2" />
              {t("badges.location")}
            </Badge>
            <Badge variant="default" className="text-sm px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {t("badges.schedule")}
            </Badge>
            <Badge variant="default" className="text-sm px-4 py-2">
              <Star className="h-4 w-4 mr-2 fill-primary text-primary" />
              {t("badges.experience")}
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight font-playfair sr-only">
              <span className="text-primary font-playfair font-extrabold">
                Gold
              </span>{" "}
              <span className="text-foreground font-extrabold">Mustache</span>
            </h1>
            {/* <div className="flex justify-center"> */}
            <Image
              src="/logo.png"
              alt="Gold Mustache Logo"
              width={300}
              height={300}
              className="mx-auto rounded-full object-cover"
            />
            {/* </div> */}
            <p className="text-xl md:text-2xl text-muted-foreground font-medium sr-only">
              {tBrand("tagline")}
            </p>
          </div>

          {/* Description */}
          <div className="max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("description")}
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Button
              size="lg"
              className="text-lg px-8 py-6 h-auto min-w-[200px] font-semibold"
              asChild
            >
              <Link href={bookingLink} className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("cta.book")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="text-lg px-8 py-6 h-auto min-w-[200px]"
            >
              <a href="#servicos">{t("cta.services")}</a>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 max-w-2xl mx-auto mb-8">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">1000+</div>
              <div className="text-sm text-muted-foreground">
                {t("stats.clients")}
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">6+</div>
              <div className="text-sm text-muted-foreground">
                {t("stats.experience")}
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">5★</div>
              <div className="text-sm text-muted-foreground">
                {t("stats.rating")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full p-1">
          <div className="w-1 h-3 bg-muted-foreground/30 rounded-full mx-auto animate-pulse" />
        </div>
      </div>
    </section>
  );
}
