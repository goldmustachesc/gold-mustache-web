import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TestimonialsSection } from "../TestimonialsSection";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

vi.mock("@/constants/testimonials", () => ({
  TESTIMONIALS: [
    {
      id: "testimonial-1",
      name: "João",
      service: "Corte",
      rating: 5,
      comment: "Excelente atendimento",
    },
    {
      id: "testimonial-2",
      name: "Pedro",
      service: "Barba",
      rating: 4,
      comment: "Muito bom",
    },
  ],
}));

vi.mock("@/components/shared/RevealOnScroll", () => ({
  RevealOnScroll: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/shared/SectionLayout", () => ({
  SectionLayout: ({
    children,
    title,
    description,
    badge,
  }: {
    children: ReactNode;
    title: string;
    description: string;
    badge: string;
  }) => (
    <section>
      <h2>{badge}</h2>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

vi.mock("@/components/shared/ResponsiveCardGrid", () => ({
  ResponsiveCardGrid: <T,>({
    items,
    keyExtractor,
    renderCard,
  }: {
    items: T[];
    keyExtractor: (item: T) => string;
    desktopCols: number;
    renderCard: (item: T) => ReactNode;
  }) => (
    <div>
      {items.map((item) => (
        <div key={keyExtractor(item)}>{renderCard(item)}</div>
      ))}
    </div>
  ),
}));

describe("TestimonialsSection", () => {
  it("renderiza depoimentos e resumo de nota", () => {
    render(<TestimonialsSection />);

    expect(screen.getByText("testimonials.badge")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.getByText("Pedro")).toBeInTheDocument();
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("Barba")).toBeInTheDocument();
    expect(screen.getByText(/Excelente atendimento/)).toBeInTheDocument();
    expect(screen.getByText("5.0")).toBeInTheDocument();
    expect(
      screen.getByText("testimonials.rating • 2 testimonials.reviews"),
    ).toBeInTheDocument();
  });
});
