import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "../button";

describe("Button", () => {
  it("renders with default size", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("h-10");
  });

  it("renders with sm size", () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole("button", { name: "Small" });
    expect(btn.className).toContain("h-9");
  });

  it("renders with lg size", () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole("button", { name: "Large" });
    expect(btn.className).toContain("h-11");
  });

  it("renders icon size with 44px minimum touch target", () => {
    render(
      <Button size="icon" aria-label="Icon">
        X
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Icon" });
    expect(btn.className).toContain("min-h-11");
    expect(btn.className).toContain("min-w-11");
  });

  it("renders mobile-icon size with explicit 44px dimensions", () => {
    render(
      <Button size="mobile-icon" aria-label="Mobile Icon">
        X
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Mobile Icon" });
    expect(btn.className).toContain("size-11");
  });

  it("applies asChild via Slot", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toHaveAttribute("href", "/test");
    expect(link).toHaveAttribute("data-slot", "button");
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const btn = screen.getByRole("button", { name: "Custom" });
    expect(btn.className).toContain("custom-class");
  });
});
