import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../Layout";

const mockUsePathname = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("../Header", () => ({
  Header: () => <div data-testid="public-header">Public Header</div>,
}));

vi.mock("../Footer", () => ({
  Footer: () => <div data-testid="public-footer">Public Footer</div>,
}));

vi.mock("@/components/ui/floating-booking-button", () => ({
  FloatingBookingButton: () => (
    <div data-testid="floating-booking-button">Floating Booking Button</div>
  ),
}));

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/pt-BR");
  });

  it("renders the public shell for public routes", () => {
    render(
      <Layout>
        <div data-testid="page-content">Page Content</div>
      </Layout>,
    );

    expect(screen.getByTestId("public-header")).toBeInTheDocument();
    expect(screen.getByTestId("public-footer")).toBeInTheDocument();
    expect(screen.getByTestId("floating-booking-button")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("hides the public shell for loyalty routes", () => {
    mockUsePathname.mockReturnValue("/pt-BR/loyalty");

    render(
      <Layout>
        <div data-testid="page-content">Page Content</div>
      </Layout>,
    );

    expect(screen.queryByTestId("public-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("public-footer")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("floating-booking-button"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });
});
