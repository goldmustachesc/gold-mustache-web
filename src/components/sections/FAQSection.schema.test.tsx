import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { FAQSection } from "./FAQSection";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      badge: "FAQ",
      title: "Questions? We Have Answers",
      description: "Find quick answers to common questions",
      "items.0.id": "test-1",
      "items.0.question": "How do I schedule an appointment?",
      "items.0.answer": "You can schedule through our app or WhatsApp.",
      "items.1.id": "test-2",
      "items.1.question": "What payment methods do you accept?",
      "items.1.answer": "We accept cash, credit cards, and PIX.",
      "items.2.id": "test-3",
      "items.2.question": "What is your cancellation policy?",
      "items.2.answer":
        "You can cancel any time before the appointment. If it’s less than 2 hours away, we’ll only show a warning.",
    };
    return translations[key] || key;
  },
}));

describe("FAQ Schema Markup", () => {
  it("generates valid FAQPage JSON-LD schema", () => {
    const { container } = render(<FAQSection />);

    // Find the schema script tag
    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeInTheDocument();

    // Parse the schema
    const schemaContent = schemaScript?.textContent;
    expect(schemaContent).toBeTruthy();

    if (!schemaContent) return;
    const schema = JSON.parse(schemaContent);

    // Verify schema structure
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toBeDefined();
    expect(Array.isArray(schema.mainEntity)).toBe(true);
  });

  it("includes all FAQ items in the schema", () => {
    const { container } = render(<FAQSection />);

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaContent = schemaScript?.textContent;
    if (!schemaContent) return;
    const schema = JSON.parse(schemaContent);

    // Should have at least the FAQ items we defined in the mock
    expect(schema.mainEntity.length).toBeGreaterThanOrEqual(3);

    // Verify the items we mocked are present
    const questions = schema.mainEntity.map(
      (item: { name: string }) => item.name,
    );
    expect(questions).toContain("How do I schedule an appointment?");
    expect(questions).toContain("What payment methods do you accept?");
    expect(questions).toContain("What is your cancellation policy?");
  });

  it("includes complete question and answer data in schema", () => {
    const { container } = render(<FAQSection />);

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaContent = schemaScript?.textContent;
    if (!schemaContent) return;
    const schema = JSON.parse(schemaContent);

    // Verify first FAQ item structure
    const firstItem = schema.mainEntity[0];
    expect(firstItem["@type"]).toBe("Question");
    expect(firstItem.name).toBe("How do I schedule an appointment?");
    expect(firstItem.acceptedAnswer).toBeDefined();
    expect(firstItem.acceptedAnswer["@type"]).toBe("Answer");
    expect(firstItem.acceptedAnswer.text).toBe(
      "You can schedule through our app or WhatsApp.",
    );
  });

  it("validates all FAQ items have required schema properties", () => {
    const { container } = render(<FAQSection />);

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaContent = schemaScript?.textContent;
    if (!schemaContent) return;
    const schema = JSON.parse(schemaContent);

    // Verify each item has the required structure
    schema.mainEntity.forEach(
      (item: {
        "@type": string;
        name: string;
        acceptedAnswer: { "@type": string; text: string };
      }) => {
        expect(item["@type"]).toBe("Question");
        expect(item.name).toBeTruthy();
        expect(typeof item.name).toBe("string");
        expect(item.acceptedAnswer).toBeDefined();
        expect(item.acceptedAnswer["@type"]).toBe("Answer");
        expect(item.acceptedAnswer.text).toBeTruthy();
        expect(typeof item.acceptedAnswer.text).toBe("string");
      },
    );
  });

  it("schema is valid JSON that can be parsed by search engines", () => {
    const { container } = render(<FAQSection />);

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaContent = schemaScript?.textContent;
    if (!schemaContent) return;

    // Should not throw when parsing
    expect(() => JSON.parse(schemaContent)).not.toThrow();

    // Should be properly formatted JSON
    const schema = JSON.parse(schemaContent);
    const reStringified = JSON.stringify(schema);
    expect(reStringified).toBeTruthy();
  });
});
