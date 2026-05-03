export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export function normalizeFAQItems(raw: unknown): FAQItem[] {
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
    .filter((item): item is FAQItem => item !== null);
}

export function generateFAQSchema(items: FAQItem[]) {
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

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
