import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppointmentsLoadingSkeleton } from "../AppointmentsLoadingSkeleton";

describe("AppointmentsLoadingSkeleton", () => {
  it("renders skeleton elements", () => {
    render(<AppointmentsLoadingSkeleton />);
    const skeletons = screen.getAllByTestId("skeleton-card");
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the mobile CTA skeleton", () => {
    render(<AppointmentsLoadingSkeleton />);
    expect(screen.getByTestId("skeleton-cta")).toBeInTheDocument();
  });
});
