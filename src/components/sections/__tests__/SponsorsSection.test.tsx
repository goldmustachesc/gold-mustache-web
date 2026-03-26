import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SponsorsSection } from "../SponsorsSection";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

vi.mock("@/components/shared/RevealOnScroll", () => ({
  RevealOnScroll: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/shared/SectionLayout", () => ({
  SectionLayout: ({
    children,
    badge,
    title,
    titleAccent,
    description,
    className,
  }: {
    children: ReactNode;
    badge: string;
    title: string;
    titleAccent: string;
    description: string;
    className?: string;
  }) => (
    <section data-class={className}>
      <span>{badge}</span>
      <span>{title}</span>
      <span>{titleAccent}</span>
      <span>{description}</span>
      {children}
    </section>
  ),
}));

const scrollNextMock = vi.fn();
let capturedSetApi: ((api: { scrollNext: () => void }) => void) | undefined;

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({
    children,
    setApi,
  }: {
    children: ReactNode;
    setApi?: (api: { scrollNext: () => void }) => void;
    className?: string;
    opts?: Record<string, unknown>;
  }) => {
    capturedSetApi = setApi;
    return <div data-testid="carousel-mock">{children}</div>;
  },
  CarouselContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselPrevious: () => <button type="button">prev</button>,
  CarouselNext: () => <button type="button">next</button>,
}));

describe("SponsorsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSetApi = undefined;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renderiza parceiros e agendamento de scroll no carousel", () => {
    render(<SponsorsSection />);

    expect(screen.getByText("sponsors.badge")).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: /Surf Trend/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link")
        .some((a) => a.getAttribute("href")?.includes("surftrend")),
    ).toBe(true);

    expect(capturedSetApi).toBeDefined();
    act(() => {
      capturedSetApi?.({ scrollNext: scrollNextMock });
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(scrollNextMock).toHaveBeenCalled();
  });

  it("não agenda intervalo quando api ainda não existe", () => {
    render(<SponsorsSection />);
    vi.advanceTimersByTime(6000);
    expect(scrollNextMock).not.toHaveBeenCalled();
  });
});
