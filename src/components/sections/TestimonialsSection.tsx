"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { TESTIMONIALS } from "@/constants/testimonials";
import { Quote, Star } from "lucide-react";
import { useTranslations } from "next-intl";

export function TestimonialsSection() {
  const t = useTranslations("testimonials");

  const renderStars = (rating: number, id?: string) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={`star-${id || "summary"}-${index}`}
        className={`h-4 w-4 ${
          index < rating
            ? "fill-yellow-500 text-yellow-500"
            : "text-muted-foreground/30"
        }`}
      />
    ));
  };

  return (
    <section className="py-20 bg-background" id="depoimentos">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Quote className="h-4 w-4 mr-2" />
            <span>{t("badge")}</span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-playfair font-bold mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Desktop: Grid de 3 colunas */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {testimonial.name}
                    </h3>
                    <CardDescription className="text-sm">
                      {testimonial.service}
                    </CardDescription>
                  </div>
                  <Quote className="h-8 w-8 text-primary/20" />
                </div>
                <div className="flex gap-1">
                  {renderStars(testimonial.rating, testimonial.id)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground italic">
                  "{testimonial.comment}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile: Carrossel */}
        <div className="md:hidden">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {TESTIMONIALS.map((testimonial) => (
                <CarouselItem key={testimonial.id}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {testimonial.name}
                          </h3>
                          <CardDescription className="text-sm">
                            {testimonial.service}
                          </CardDescription>
                        </div>
                        <Quote className="h-8 w-8 text-primary/20" />
                      </div>
                      <div className="flex gap-1">
                        {renderStars(testimonial.rating, testimonial.id)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground italic">
                        "{testimonial.comment}"
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>

        {/* Rating Summary */}
        <div className="mt-12 text-center">
          <Card className="max-w-md mx-auto bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex gap-1">{renderStars(5)}</div>
                <span className="text-2xl font-bold">5.0</span>
              </div>
              <p className="text-muted-foreground">
                {t("rating")} • {TESTIMONIALS.length} {t("reviews")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
