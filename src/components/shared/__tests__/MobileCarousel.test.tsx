import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileCarousel } from "../MobileCarousel";

vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), null],
}));

describe("MobileCarousel", () => {
  it("renderiza children corretamente", () => {
    render(
      <MobileCarousel>
        <div>Slide 1</div>
        <div>Slide 2</div>
        <div>Slide 3</div>
      </MobileCarousel>,
    );

    expect(screen.getByText("Slide 1")).toBeInTheDocument();
    expect(screen.getByText("Slide 2")).toBeInTheDocument();
    expect(screen.getByText("Slide 3")).toBeInTheDocument();
  });

  it("retorna null quando não há children", () => {
    const { container } = render(<MobileCarousel>{[]}</MobileCarousel>);

    expect(container.firstChild).toBeNull();
  });

  it("renderiza com data-testid para integração", () => {
    render(
      <MobileCarousel>
        <div>Item</div>
      </MobileCarousel>,
    );

    expect(screen.getByTestId("mobile-carousel")).toBeInTheDocument();
  });

  it("aplica className customizada", () => {
    render(
      <MobileCarousel className="custom-class">
        <div>Item</div>
      </MobileCarousel>,
    );

    const carousel = screen.getByTestId("mobile-carousel");
    expect(carousel.className).toContain("custom-class");
  });

  it("renderiza slides com largura correta", () => {
    const { container } = render(
      <MobileCarousel>
        <div>Slide A</div>
        <div>Slide B</div>
      </MobileCarousel>,
    );

    const slides = container.querySelectorAll('[class*="w-[85%]"]');
    expect(slides.length).toBe(2);
  });

  it("adiciona spacer para loop quando há 2+ itens", () => {
    const { container } = render(
      <MobileCarousel>
        <div>Slide A</div>
        <div>Slide B</div>
      </MobileCarousel>,
    );

    const spacer = container.querySelector('[aria-hidden="true"]');
    expect(spacer).toBeInTheDocument();
  });

  it("não adiciona spacer quando há apenas 1 item", () => {
    const { container } = render(
      <MobileCarousel>
        <div>Único</div>
      </MobileCarousel>,
    );

    const spacer = container.querySelector('[aria-hidden="true"]');
    expect(spacer).not.toBeInTheDocument();
  });
});
