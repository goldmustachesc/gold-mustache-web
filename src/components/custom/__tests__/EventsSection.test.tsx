import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { EventsSection } from "../EventsSection";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `events.${key}`,
}));

vi.mock("@/components/shared/SectionLayout", () => ({
  SectionLayout: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/shared/RevealOnScroll", () => ({
  RevealOnScroll: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/video-embed", () => ({
  VideoEmbed: () => <div data-testid="video" />,
}));

describe("EventsSection", () => {
  it("renderiza embed e link de whatsapp", () => {
    render(<EventsSection />);

    expect(screen.getByTestId("video")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "events.cta.button" }),
    ).toHaveAttribute("href", expect.stringContaining("wa.me"));
  });
});
