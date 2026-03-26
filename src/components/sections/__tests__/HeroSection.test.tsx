import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeroSection } from "../HeroSection";

const mocks = vi.hoisted(() => ({
  useBookingSettings: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    target?: string;
    rel?: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => mocks.useBookingSettings(),
}));

class MockIntersectionObserver implements IntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(el: Element) {
    this.callback(
      [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
      this,
    );
  }

  disconnect() {}

  unobserve() {}

  takeRecords() {
    return [];
  }

  readonly root = null;

  readonly rootMargin = "";

  readonly thresholds = [];
}

describe("HeroSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("renderiza conteúdo principal e CTA de agendamento externo", () => {
    mocks.useBookingSettings.mockReturnValue({
      bookingHref: "https://agenda.externa",
      shouldShowBooking: true,
      isExternal: true,
    });

    render(<HeroSection />);

    expect(screen.getByText("brand.tagline")).toBeInTheDocument();
    expect(screen.getByText("hero.description")).toBeInTheDocument();
    expect(screen.getByText("hero.badges.location")).toBeInTheDocument();
    expect(screen.getByText("hero.stats.clients")).toBeInTheDocument();

    const bookLink = screen.getByRole("link", { name: /hero.cta.book/i });
    expect(bookLink).toHaveAttribute("href", "https://agenda.externa");
    expect(bookLink).toHaveAttribute("target", "_blank");
    expect(bookLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(
      screen.getByRole("link", { name: /hero.cta.services/i }),
    ).toHaveAttribute("href", "#servicos");
  });

  it("omite CTAs quando agendamento não deve aparecer", () => {
    mocks.useBookingSettings.mockReturnValue({
      bookingHref: null,
      shouldShowBooking: false,
      isExternal: false,
    });

    render(<HeroSection />);

    expect(
      screen.queryByRole("link", { name: /hero.cta.book/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /hero.cta.services/i }),
    ).not.toBeInTheDocument();
  });
});
