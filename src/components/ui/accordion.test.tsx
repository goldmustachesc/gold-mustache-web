import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./accordion";

/**
 * Feature: faq-section, Property 4: Accordion collapse interaction
 * Validates: Requirements 2.2
 */

// Custom generator for non-empty, non-whitespace strings
// Normalizes multiple spaces to single space to match DOM behavior
const nonEmptyString = (minLength: number, maxLength: number) =>
  fc
    .string({ minLength, maxLength })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim().replace(/\s+/g, " "));

describe("Accordion expand/collapse behavior", () => {
  it("Property 4: For any expanded FAQ item, clicking it should collapse and hide the answer", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyString(5, 100),
        nonEmptyString(10, 200),
        async (question, answer) => {
          const user = userEvent.setup();

          // Start with the item expanded
          const { container, unmount } = render(
            <Accordion type="multiple" defaultValue={["item-1"]}>
              <AccordionItem value="item-1">
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>{answer}</AccordionContent>
              </AccordionItem>
            </Accordion>,
          );

          // Find the trigger button within this specific container
          const trigger = within(container).getByRole("button", {
            name: question,
          });

          // Initially, the item should be expanded (data-state="open")
          const accordionItem = container.querySelector("[data-state]");
          expect(accordionItem).toHaveAttribute("data-state", "open");

          // Click to collapse
          await user.click(trigger);

          // After clicking, the item should be collapsed (data-state="closed")
          expect(accordionItem).toHaveAttribute("data-state", "closed");

          // Clean up after each test iteration
          unmount();
        },
      ),
      { numRuns: 100 },
    );
  }, 15000);
});
