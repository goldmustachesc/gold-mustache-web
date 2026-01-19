"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations("hero");
  const tBrand = useTranslations("brand");
  const locale = useLocale();
  const bookingLink = `/${locale}/agendar`;

  return (
    <section className="relative min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <Image
        src="/images/interno/interno-01.webp"
        alt="Interior da Gold Mustache Barbearia"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Overlay - gradiente para legibilidade (mobile-first, adaptado para dark mode) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 dark:from-black/80 dark:via-black/60 dark:to-black/90" />

      {/* Vinheta sutil nas bordas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

      {/* Content */}
      <div className="container relative z-10 px-4 py-12 md:py-16 lg:py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6 md:space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="Gold Mustache Logo"
                width={140}
                height={140}
                className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full object-cover ring-2 ring-primary/40 shadow-2xl"
                priority
              />
              {/* Glow effect atrás da logo */}
              <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-2xl scale-150" />
            </div>
          </div>

          {/* Brand Name (sr-only para SEO, visualmente representado pela logo) */}
          <h1 className="sr-only">Gold Mustache Barbearia</h1>

          {/* Tagline */}
          <p className="text-lg md:text-xl lg:text-2xl font-playfair font-medium text-white/90 tracking-wide">
            {tBrand("tagline")}
          </p>

          {/* Description */}
          <p className="text-sm md:text-base lg:text-lg text-white/75 leading-relaxed max-w-xl mx-auto">
            {t("description")}
          </p>

          {/* CTA Principal */}
          <div className="pt-4 md:pt-6">
            <Button
              size="lg"
              className="text-base md:text-lg px-8 py-6 h-auto font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              asChild
            >
              <Link href={bookingLink} className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("cta.book")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
