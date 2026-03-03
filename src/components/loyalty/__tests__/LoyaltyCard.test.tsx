import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LoyaltyCard } from "../LoyaltyCard";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("LoyaltyCard", () => {
  it("should render the points balance correctly", () => {
    render(<LoyaltyCard points={350} tier="SILVER" />);
    expect(screen.getByText("350")).toBeInTheDocument();
  });

  it("should not render 0 or undefined when points are provided", () => {
    render(<LoyaltyCard points={1200} tier="GOLD" />);
    expect(screen.getByText("1200")).toBeInTheDocument();
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });

  it("should render the correct tier badge", () => {
    const { container } = render(<LoyaltyCard points={100} tier="DIAMOND" />);
    const header = container.querySelector(
      '[data-slot="card-header"]',
    ) as HTMLElement;
    expect(within(header).getByText("diamond")).toBeInTheDocument();
  });
});

describe("TierProgress (via LoyaltyCard)", () => {
  it("should render progress for a non-max tier", () => {
    render(<LoyaltyCard points={600} tier="SILVER" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should show max text for DIAMOND tier", () => {
    render(<LoyaltyCard points={5000} tier="DIAMOND" />);
    expect(screen.getByText("max")).toBeInTheDocument();
  });
});
