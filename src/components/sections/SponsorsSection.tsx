"use client";

import { Badge } from "@/components/ui/badge";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { HandshakeIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

const sponsors = [
  {
    id: 1,
    name: "Surf Trend: Loja de Surf Itapema",
    logo: "/images/sponsors/surf-trend-logo-instagram.jpeg",
    website: "https://www.surftrend.com.br/",
  },
  {
    id: 2,
    name: "Visão Solidária Ótica Itapema",
    logo: "/images/sponsors/visao-solidaria-logo.jpg",
    website: "https://www.instagram.com/ivs.itapema/",
  },
  {
    id: 3,
    name: "Surf Trend: Loja de Surf Itapema",
    logo: "/images/sponsors/surf-trend-logo-instagram.jpeg",
    website: "https://www.surftrend.com.br/",
  },
  {
    id: 4,
    name: "Visão Solidária Ótica Itapema",
    logo: "/images/sponsors/visao-solidaria-logo.jpg",
    website: "https://www.instagram.com/ivs.itapema/",
  },
  {
    id: 5,
    name: "Surf Trend: Loja de Surf Itapema",
    logo: "/images/sponsors/surf-trend-logo-instagram.jpeg",
    website: "https://www.surftrend.com.br/",
  },
  {
    id: 6,
    name: "Visão Solidária Ótica Itapema",
    logo: "/images/sponsors/visao-solidaria-logo.jpg",
    website: "https://www.instagram.com/ivs.itapema/",
  },
  {
    id: 7,
    name: "Surf Trend: Loja de Surf Itapema",
    logo: "/images/sponsors/surf-trend-logo-instagram.jpeg",
    website: "https://www.surftrend.com.br/",
  },
  {
    id: 8,
    name: "Visão Solidária Ótica Itapema",
    logo: "/images/sponsors/visao-solidaria-logo.jpg",
    website: "https://www.instagram.com/ivs.itapema/",
  },
];

export function SponsorsSection() {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 3000);

    return () => clearInterval(interval);
  }, [api]);

  return (
    <section id="parceiros" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <HandshakeIcon className="h-4 w-4 mr-2" />
            Patrocinadores
          </Badge>
          <h2 className="text-3xl font-playfair font-bold text-foreground mb-4">
            Nossos <span className="text-primary">Parceiros</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Conheça as marcas que confiam no nosso trabalho e apoiam a Gold
            Mustache
          </p>
        </div>

        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
            slidesToScroll: 1,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4 cursor-pointer hover:border-primary">
            {sponsors.map((sponsor) => (
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
                        className="max-h-36 w-auto object-contain group-hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                  </a>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
