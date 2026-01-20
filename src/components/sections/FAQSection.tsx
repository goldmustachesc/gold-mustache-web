"use client";

import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useMemo } from "react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Generates FAQPage JSON-LD schema markup for SEO
 * @param items - Array of FAQ items with questions and answers
 * @returns JSON-LD schema object conforming to schema.org FAQPage specification
 */
function generateFAQSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

function FAQSectionComponent() {
  const t = useTranslations("faq");

  // Memoize FAQ items to prevent recalculation on every render
  const faqItems = useMemo(() => {
    // Use `raw` to avoid missing-message warnings when locales have fewer items.
    // `items` is an array in our locale JSON files.
    const raw = t.raw("items");
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        const maybe = item as Partial<FAQItem>;
        if (!maybe.id || !maybe.question || !maybe.answer) return null;

        return {
          id: String(maybe.id),
          question: String(maybe.question),
          answer: String(maybe.answer),
        };
      })
      .filter(Boolean) as FAQItem[];
  }, [t]);

  // Memoize FAQ schema generation
  const faqSchema = useMemo(() => generateFAQSchema(faqItems), [faqItems]);

  return (
    <>
      {/* FAQ Schema Markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

      <section
        className="py-20 bg-background"
        id="faq"
        aria-labelledby="faq-title"
        aria-describedby="faq-description"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <HelpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              <span>{t("badge")}</span>
            </Badge>
            <h2
              id="faq-title"
              className="text-3xl md:text-4xl font-playfair font-bold mb-4"
            >
              {t("title")}
            </h2>
            <p
              id="faq-description"
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              {t("description")}
            </p>
          </div>

          {/* FAQ Grid - Single column on mobile, two columns on desktop */}
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqItems.map((item) => (
                <div key={item.id} className="flex">
                  <Accordion
                    type="multiple"
                    className="w-full border rounded-lg px-4 bg-card hover:shadow-md transition-shadow"
                  >
                    <AccordionItem value={item.id} className="border-none">
                      <AccordionTrigger className="text-left hover:no-underline">
                        <span className="text-base font-semibold pr-4">
                          {item.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Memoize the entire component to prevent unnecessary re-renders
// when parent components update but FAQ props haven't changed
export const FAQSection = memo(FAQSectionComponent);
