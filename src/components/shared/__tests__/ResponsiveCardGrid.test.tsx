import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ResponsiveCardGrid } from "../ResponsiveCardGrid";

vi.mock("../RevealOnScroll", () => ({
  RevealOnScroll: ({
    children,
  }: {
    children: ReactNode;
    delay?: number;
    direction?: string;
  }) => <div data-testid="reveal">{children}</div>,
}));

vi.mock("../MobileCarousel", () => ({
  MobileCarousel: ({ children }: { children: ReactNode }) => (
    <div data-testid="mobile-carousel">{children}</div>
  ),
}));

describe("ResponsiveCardGrid", () => {
  const items = [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
  ];

  it("renderiza cards no mobile carousel e no grid desktop", () => {
    const { container } = render(
      <ResponsiveCardGrid
        items={items}
        keyExtractor={(i) => i.id}
        desktopCols={4}
        staggerDelay={0.05}
        renderCard={(item, index) => <div>{`${item.label}-${index}`}</div>}
        className="extra"
      />,
    );

    expect(screen.getAllByText("Alpha-0")).toHaveLength(2);
    expect(screen.getAllByText("Beta-1")).toHaveLength(2);

    const mobileCarousel = screen.getByTestId("mobile-carousel");
    expect(mobileCarousel).toBeInTheDocument();

    const reveals = screen.getAllByTestId("reveal");
    expect(reveals.length).toBe(2);

    const mobile = container.querySelector('[class*="md:hidden"]');
    const desktop = container.querySelector('[class*="lg:grid-cols-4"]');
    expect(mobile?.className).toContain("extra");
    expect(desktop?.className).toContain("lg:grid-cols-4");
  });

  it("usa classes de 2 e 3 colunas", () => {
    const { container: c2 } = render(
      <ResponsiveCardGrid
        items={items}
        keyExtractor={(i) => i.id}
        desktopCols={2}
        renderCard={(item) => <span>{item.label}</span>}
      />,
    );
    expect(
      c2.querySelector('[class*="md:grid-cols-2"]')?.className,
    ).toBeTruthy();

    const { container: c3 } = render(
      <ResponsiveCardGrid
        items={items}
        keyExtractor={(i) => i.id}
        desktopCols={3}
        renderCard={(item) => <span>{item.label}</span>}
      />,
    );
    expect(
      c3.querySelector('[class*="lg:grid-cols-3"]')?.className,
    ).toBeTruthy();
  });
});
