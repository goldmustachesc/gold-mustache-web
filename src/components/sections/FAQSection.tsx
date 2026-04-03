"use client";

import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { SectionLayout } from "@/components/shared/SectionLayout";
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

  const faqItems = useMemo(() => {
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

  const faqSchema = useMemo(() => generateFAQSchema(faqItems), [faqItems]);

  const midpoint = Math.ceil(faqItems.length / 2);
  const leftColumn = faqItems.slice(0, midpoint);
  const rightColumn = faqItems.slice(midpoint);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
        }}
      />

      <SectionLayout
        id="faq"
        icon={HelpCircle}
        badge={t("badge")}
        title={t("title")}
        description={t("description")}
        aria-labelledby="faq-title"
        aria-describedby="faq-description"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[leftColumn, rightColumn].map((column, colIndex) => (
              <RevealOnScroll
                key={colIndex === 0 ? "faq-left" : "faq-right"}
                delay={colIndex * 0.1}
                direction={colIndex === 0 ? "left" : "right"}
              >
                <Accordion type="multiple" className="space-y-3">
                  {column.map((item) => (
                    <AccordionItem
                      key={item.id}
                      value={item.id}
                      className="border rounded-lg px-4 bg-card hover:shadow-md transition-shadow hover:border-primary/30"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        <span className="text-base font-semibold pr-4">
                          {item.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </SectionLayout>
    </>
  );
}

export const FAQSection = memo(FAQSectionComponent);
