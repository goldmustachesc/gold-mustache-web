"use client";

import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { ResponsiveCardGrid } from "@/components/shared/ResponsiveCardGrid";
import { SectionLayout } from "@/components/shared/SectionLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TESTIMONIALS } from "@/constants/testimonials";
import { Quote, Star } from "lucide-react";
import { useTranslations } from "next-intl";

function Stars({ rating, id }: { rating: number; id?: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`star-${id || "summary"}-${index}`}
          className={`h-4 w-4 ${
            index < rating
              ? "fill-yellow-500 text-yellow-500"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof TESTIMONIALS)[number];
}) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:border-primary/30 h-full">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-lg">{testimonial.name}</h3>
            <p className="text-sm text-muted-foreground">
              {testimonial.service}
            </p>
          </div>
          <Quote className="h-8 w-8 text-primary/20 shrink-0" />
        </div>
        <Stars rating={testimonial.rating} id={testimonial.id} />
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground italic leading-relaxed">
          &ldquo;{testimonial.comment}&rdquo;
        </p>
      </CardContent>
    </Card>
  );
}

export function TestimonialsSection() {
  const t = useTranslations("testimonials");

  return (
    <SectionLayout
      id="depoimentos"
      icon={Quote}
      badge={t("badge")}
      title={t("title")}
      description={t("description")}
    >
      <ResponsiveCardGrid
        items={TESTIMONIALS}
        keyExtractor={(item) => item.id}
        desktopCols={3}
        renderCard={(testimonial) => (
          <TestimonialCard testimonial={testimonial} />
        )}
      />

      <RevealOnScroll delay={0.3}>
        <div className="mt-12 text-center">
          <Card className="max-w-md mx-auto bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Stars rating={5} />
                <span className="text-2xl font-bold">5.0</span>
              </div>
              <p className="text-muted-foreground">
                {t("rating")} &bull; {TESTIMONIALS.length} {t("reviews")}
              </p>
            </CardContent>
          </Card>
        </div>
      </RevealOnScroll>
    </SectionLayout>
  );
}
