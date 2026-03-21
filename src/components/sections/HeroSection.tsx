"use client";

import { Button } from "@/components/ui/button";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

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
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 40,
    stiffness: 100,
    duration: duration * 1000,
  });
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      motionValue.set(target);
    }
  }, [isInView, motionValue, target]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${Math.floor(latest)}${suffix}`;
      }
    });
    return unsubscribe;
  }, [springValue, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const easeOut: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: easeOut },
  },
};

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
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 dark:from-black/80 dark:via-black/60 dark:to-black/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

      <div className="container relative z-10 px-4 py-12 md:py-16 lg:py-20">
        <motion.div
          className="max-w-2xl mx-auto text-center space-y-6 md:space-y-8"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="flex justify-center" variants={scaleIn}>
            <div className="relative">
              <Image
                src="/logo.png"
                alt="Gold Mustache Logo"
                width={140}
                height={140}
                className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full object-cover ring-2 ring-primary/40 shadow-2xl"
                sizes="(max-width: 768px) 112px, (max-width: 1024px) 144px, 176px"
                priority
              />
              <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-2xl scale-150" />
            </div>
          </motion.div>

          <h1 className="sr-only">Gold Mustache Barbearia</h1>

          <motion.div variants={fadeUp} className="space-y-2">
            <div className="flex items-center justify-center gap-3 text-xs md:text-sm text-white/60 tracking-widest uppercase">
              <span>{t("badges.location")}</span>
              <span className="w-1 h-1 rounded-full bg-primary" />
              <span>{t("badges.schedule")}</span>
              <span className="w-1 h-1 rounded-full bg-primary" />
              <span>{t("badges.experience")}</span>
            </div>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-lg md:text-xl lg:text-2xl font-playfair font-medium text-white/90 tracking-wide"
          >
            {tBrand("tagline")}
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="text-sm md:text-base lg:text-lg text-white/70 leading-relaxed max-w-xl mx-auto"
          >
            {t("description")}
          </motion.p>

          {shouldShowBooking && bookingHref && (
            <motion.div
              variants={fadeUp}
              className="pt-2 md:pt-4 flex flex-col sm:flex-row gap-3 justify-center"
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
            </motion.div>
          )}

          <motion.div
            variants={fadeUp}
            className="pt-6 md:pt-10 grid grid-cols-3 gap-4 md:gap-8 max-w-lg mx-auto"
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
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
