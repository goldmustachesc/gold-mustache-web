/**
 * Dark Mode Support Tests for FAQ Section
 * Validates: Requirements 9.1, 9.5
 */

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FAQSection } from "./FAQSection";

const mockMessages = {
  faq: {
    badge: "FAQ",
    title: "Frequently Asked Questions",
    description: "Find answers to common questions",
    items: [
      {
        id: "test-1",
        question: "Test Question 1?",
        answer: "Test Answer 1",
      },
      {
        id: "test-2",
        question: "Test Question 2?",
        answer: "Test Answer 2",
      },
    ],
  },
};

describe("FAQSection - Dark Mode Support", () => {
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    // Se houver MISSING_MESSAGE do next-intl/use-intl, queremos que o teste falhe,
    // mas sem poluir o output. A asserção no afterEach garante isso.
    .mockImplementation(() => {});

  afterEach(() => {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockClear();
  });

  it("should use theme-aware background classes", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <FAQSection />
      </NextIntlClientProvider>,
    );

    const section = container.querySelector("section");
    expect(section).toHaveClass("bg-background");
  });

  it("should use theme-aware text color classes", () => {
    render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <FAQSection />
      </NextIntlClientProvider>,
    );

    const description = screen.getByText("Find answers to common questions");
    expect(description).toHaveClass("text-muted-foreground");
  });

  it("should use theme-aware card background classes", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <FAQSection />
      </NextIntlClientProvider>,
    );

    const accordions = container.querySelectorAll(".bg-card");
    expect(accordions.length).toBeGreaterThan(0);
  });

  it("should have proper focus ring classes for accessibility", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <FAQSection />
      </NextIntlClientProvider>,
    );

    const triggers = container.querySelectorAll("button");
    triggers.forEach((trigger) => {
      expect(trigger.className).toContain("focus-visible:ring-ring");
    });
  });

  it("should use theme-aware border classes", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <FAQSection />
      </NextIntlClientProvider>,
    );

    const accordions = container.querySelectorAll(".border");
    expect(accordions.length).toBeGreaterThan(0);
  });
});
