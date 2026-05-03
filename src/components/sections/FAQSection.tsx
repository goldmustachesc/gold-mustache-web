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
import { normalizeFAQItems } from "./faq-schema";
import { memo, useMemo } from "react";

function FAQSectionComponent() {
  const t = useTranslations("faq");

  const faqItems = useMemo(() => {
    return normalizeFAQItems(t.raw("items"));
  }, [t]);

  const midpoint = Math.ceil(faqItems.length / 2);
  const leftColumn = faqItems.slice(0, midpoint);
  const rightColumn = faqItems.slice(midpoint);

  return (
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
  );
}

export const FAQSection = memo(FAQSectionComponent);
