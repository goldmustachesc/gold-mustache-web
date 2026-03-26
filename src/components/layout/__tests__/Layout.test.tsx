import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

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

const { Header } = await import("../Header");
const { Footer } = await import("../Footer");
const { FloatingBookingButton } = await import(
  "@/components/ui/floating-booking-button"
);

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingBookingButton />
    </div>
  );
}

describe("PublicShell", () => {
  it("renderiza shell com header, main, footer e floating button", () => {
    render(
      <PublicShell>
        <div data-testid="page-content">Page Content</div>
      </PublicShell>,
    );

    expect(screen.getByTestId("public-header")).toBeInTheDocument();
    expect(screen.getByTestId("public-footer")).toBeInTheDocument();
    expect(screen.getByTestId("floating-booking-button")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });
});
