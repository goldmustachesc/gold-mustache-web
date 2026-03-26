"use client";

import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { SectionLayout } from "@/components/shared/SectionLayout";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { HandshakeIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const sponsors = [
  {
    id: "surf-trend",
    name: "Surf Trend: Loja de Surf Itapema",
    logo: "/images/sponsors/surf-trend-logo-instagram.webp",
    website: "https://www.surftrend.com.br/",
  },
  {
    id: "visao-solidaria",
    name: "Visão Solidária Ótica Itapema",
    logo: "/images/sponsors/visao-solidaria-logo.webp",
    website: "https://www.instagram.com/ivs.itapema/",
  },
];

const repeatedSponsors = Array.from({ length: 4 }, (_, i) =>
  sponsors.map((s) => ({ ...s, id: `${s.id}-${i}` })),
).flat();

export function SponsorsSection() {
  const t = useTranslations("sponsors");
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 3000);

    return () => clearInterval(interval);
  }, [api]);

  return (
    <SectionLayout
      id="parceiros"
      icon={HandshakeIcon}
      badge={t("badge")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      description={t("description")}
      className="py-16 bg-muted/30"
    >
      <RevealOnScroll>
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
            slidesToScroll: 1,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {repeatedSponsors.map((sponsor) => (
              <CarouselItem
                key={sponsor.id}
                className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
              >
                <div className="p-1">
                  <a
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group cursor-pointer"
                  >
                    <div className="rounded-lg transition-all duration-300 p-6 h-40 flex items-center justify-center group-hover:scale-105">
                      <Image
                        src={sponsor.logo}
                        alt={sponsor.name}
                        width={160}
                        height={160}
                        className="max-h-36 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                  </a>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </RevealOnScroll>
    </SectionLayout>
  );
}
