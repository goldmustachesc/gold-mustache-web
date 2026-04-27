"use client";

import { Button } from "@/components/ui/button";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

function AnimatedCounter({
  target,
  suffix = "",
  duration = 2,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        const start = performance.now();
        const durationMs = duration * 1000;

        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const eased = 1 - (1 - t) ** 3;
          setDisplay(Math.floor(eased * target));
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            setDisplay(target);
          }
        };
        requestAnimationFrame(tick);
      },
      { rootMargin: "0px", threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export function HeroSection() {
  const t = useTranslations("hero");
  const tBrand = useTranslations("brand");
  const { bookingHref, shouldShowBooking, isExternal } = useBookingSettings();

  const bookingLinkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  const stats = [
    {
      value: 1000,
      suffix: "+",
      label: t("stats.clients"),
    },
    {
      value: 6,
      suffix: "+",
      label: t("stats.experience"),
    },
    {
      value: 5,
      suffix: "★",
      label: t("stats.rating"),
    },
  ];

  return (
    <section className="relative min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/interno/interno-01.webp"
          alt="Interior da Gold Mustache Barbearia"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65 dark:from-black/65 dark:via-black/45 dark:to-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)]" />

      <div className="container relative z-10 px-4 py-12 md:py-16 lg:py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6 md:space-y-8">
          <div
            className="flex justify-center hero-anim-logo"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="relative">
              <Image
                src="/logo.png"
                alt="Gold Mustache Logo"
                width={140}
                height={140}
                priority
                className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full object-cover ring-2 ring-primary/40 shadow-2xl"
                sizes="(max-width: 768px) 112px, (max-width: 1024px) 144px, 176px"
              />
              <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-2xl scale-150" />
            </div>
          </div>

          <h1 className="sr-only">Gold Mustache Barbearia</h1>

          <div
            className="space-y-2 hero-anim-fade-up"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="flex items-center justify-center gap-3 text-xs md:text-sm text-white/60 tracking-widest uppercase">
              <span>{t("badges.location")}</span>
              <span className="w-1 h-1 rounded-full bg-primary" />
              <span>{t("badges.schedule")}</span>
              <span className="w-1 h-1 rounded-full bg-primary" />
              <span>{t("badges.experience")}</span>
            </div>
          </div>

          <p
            className="text-lg md:text-xl lg:text-2xl font-playfair font-medium text-white/90 tracking-wide hero-anim-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            {tBrand("tagline")}
          </p>

          <p
            className="text-sm md:text-base lg:text-lg text-white/70 leading-relaxed max-w-xl mx-auto hero-anim-fade-up"
            style={{ animationDelay: "0.65s" }}
          >
            {t("description")}
          </p>

          {shouldShowBooking && bookingHref && (
            <div
              className="pt-2 md:pt-4 flex flex-col sm:flex-row gap-3 justify-center hero-anim-fade-up"
              style={{ animationDelay: "0.8s" }}
            >
              <Button
                size="lg"
                className="text-base md:text-lg px-8 py-6 h-auto font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03]"
                asChild
              >
                <Link
                  href={bookingHref}
                  className="flex items-center gap-2"
                  {...bookingLinkProps}
                >
                  <Calendar className="h-5 w-5" />
                  {t("cta.book")}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base md:text-lg px-8 py-6 h-auto font-semibold border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white transition-all duration-300"
                asChild
              >
                <Link href="#servicos" className="flex items-center gap-2">
                  {t("cta.services")}
                </Link>
              </Button>
            </div>
          )}

          <div
            className="pt-6 md:pt-10 grid grid-cols-3 gap-4 md:gap-8 max-w-lg mx-auto hero-anim-fade-up"
            style={{ animationDelay: "0.95s" }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white font-mono tabular-nums">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs md:text-sm text-white/50 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
