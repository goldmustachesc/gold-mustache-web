import { getTranslations } from "next-intl/server";
import { generateFAQSchema, normalizeFAQItems, safeJsonLd } from "./faq-schema";

export async function FAQSectionSchema() {
  const t = await getTranslations("faq");
  const faqItems = normalizeFAQItems(t.raw("items"));
  const faqSchema = generateFAQSchema(faqItems);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLd(faqSchema),
      }}
    />
  );
}
