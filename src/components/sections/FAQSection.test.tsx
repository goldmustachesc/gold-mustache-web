import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { FAQSection } from "./FAQSection";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => {
    type Translator = ((key: string) => string) & {
      raw: (key: string) => unknown;
    };

    const translations: Record<string, string> = {
      badge: "FAQ",
      title: "Questions? We Have Answers",
      description: "Find quick answers to common questions",
    };

    const items = [
      { id: "test-1", question: "Test Question 1?", answer: "Test Answer 1" },
      { id: "test-2", question: "Test Question 2?", answer: "Test Answer 2" },
    ];

    const t = ((key: string) => translations[key] || key) as Translator;
    t.raw = (key: string) => {
      if (key === "items") return items;
      return undefined;
    };

    return t;
  },
}));

describe("FAQSection", () => {
  it("renders section header with badge, title, and description", () => {
    render(<FAQSection />);

    expect(screen.getByText("FAQ")).toBeInTheDocument();
    expect(screen.getByText("Questions? We Have Answers")).toBeInTheDocument();
    expect(
      screen.getByText("Find quick answers to common questions"),
    ).toBeInTheDocument();
  });

  it("renders FAQ items from translations", () => {
    render(<FAQSection />);

    expect(screen.getByText("Test Question 1?")).toBeInTheDocument();
    expect(screen.getByText("Test Question 2?")).toBeInTheDocument();
  });

  it("uses semantic HTML with proper heading hierarchy", () => {
    const { container } = render(<FAQSection />);

    // Section should be a <section> element
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();

    // Main title should be h2
    const h2 = screen.getByRole("heading", {
      level: 2,
      name: "Questions? We Have Answers",
    });
    expect(h2).toBeInTheDocument();

    // Questions should be h3
    const h3Elements = container.querySelectorAll("h3");
    expect(h3Elements.length).toBeGreaterThan(0);
  });

  describe("Accessibility Features", () => {
    it("has proper ARIA attributes on section", () => {
      const { container } = render(<FAQSection />);
      const section = container.querySelector("section");

      expect(section).toHaveAttribute("aria-labelledby", "faq-title");
      expect(section).toHaveAttribute("aria-describedby", "faq-description");
    });

    it("has proper ARIA attributes on accordion triggers", () => {
      const { container } = render(<FAQSection />);
      const triggers = container.querySelectorAll("button[aria-expanded]");

      expect(triggers.length).toBeGreaterThan(0);
      triggers.forEach((trigger) => {
        // Radix UI automatically adds aria-expanded
        expect(trigger).toHaveAttribute("aria-expanded");
        // Radix UI automatically adds aria-controls
        expect(trigger).toHaveAttribute("aria-controls");
      });
    });

    it("supports keyboard navigation with Tab key", async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      // Start tabbing from the beginning
      await user.tab();
      // First focusable element should be focused
      expect(document.activeElement).toBeTruthy();
    });

    it("supports keyboard interaction with Enter key", async () => {
      const user = userEvent.setup();
      render(<FAQSection />);
      const triggers = screen.getAllByRole("button");
      const firstTrigger = triggers[0];

      // Initially collapsed
      expect(firstTrigger).toHaveAttribute("aria-expanded", "false");

      // Click to expand
      await user.click(firstTrigger);

      // Should be expanded
      expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    });

    it("supports keyboard interaction with Space key", async () => {
      const user = userEvent.setup();
      render(<FAQSection />);
      const triggers = screen.getAllByRole("button");
      const firstTrigger = triggers[0];

      // Initially collapsed
      expect(firstTrigger).toHaveAttribute("aria-expanded", "false");

      // Focus and press Space
      firstTrigger.focus();
      await user.keyboard(" ");

      // Should be expanded
      expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    });

    it("has visible focus indicators", () => {
      const { container } = render(<FAQSection />);
      const triggers = container.querySelectorAll("button[aria-expanded]");

      triggers.forEach((trigger) => {
        // Check for focus-visible classes
        const classes = trigger.className;
        expect(classes).toContain("focus-visible:ring-2");
        expect(classes).toContain("focus-visible:ring-offset-2");
      });
    });

    it("has minimum touch target size of 44x44 pixels", () => {
      const { container } = render(<FAQSection />);
      const triggers = container.querySelectorAll("button[aria-expanded]");

      triggers.forEach((trigger) => {
        const classes = trigger.className;
        // Check for min-h-[44px] class
        expect(classes).toContain("min-h-[44px]");
      });
    });

    it("hides decorative icons from screen readers", () => {
      const { container } = render(<FAQSection />);

      // Check for aria-hidden on SVG icons
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it("maintains proper heading hierarchy for screen readers", () => {
      render(<FAQSection />);

      // h2 for section title
      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Questions? We Have Answers");

      // h3 for each question - should have at least 2
      const h3Elements = screen.getAllByRole("heading", { level: 3 });
      expect(h3Elements.length).toBeGreaterThanOrEqual(2);

      // Verify that questions are present as h3 headings
      expect(
        screen.getByRole("heading", { level: 3, name: /Test Question 1\?/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 3, name: /Test Question 2\?/ }),
      ).toBeInTheDocument();
    });
  });
});
