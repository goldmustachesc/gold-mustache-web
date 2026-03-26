import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarberChairIcon } from "../BarberChairIcon";

describe("BarberChairIcon", () => {
  it("renders an SVG element", () => {
    const { container } = render(<BarberChairIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <BarberChairIcon className="h-16 w-16 text-white/5" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-16", "w-16", "text-white/5");
  });

  it("is hidden from accessibility tree", () => {
    const { container } = render(<BarberChairIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
