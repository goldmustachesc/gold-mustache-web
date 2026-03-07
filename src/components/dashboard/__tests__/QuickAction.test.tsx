import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickAction } from "../QuickAction";

describe("QuickAction", () => {
  it("renders label text", () => {
    render(
      <QuickAction
        href="/test"
        icon={<span data-testid="icon">IC</span>}
        label="Test Action"
      />,
    );
    expect(screen.getByText("Test Action")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    render(
      <QuickAction
        href="/test"
        icon={<span data-testid="icon">IC</span>}
        label="Test"
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <QuickAction
        href="/test"
        icon={<span>IC</span>}
        label="Test"
        description="Some description"
      />,
    );
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("does not render description when omitted", () => {
    render(<QuickAction href="/test" icon={<span>IC</span>} label="Test" />);
    expect(screen.queryByText("Some description")).not.toBeInTheDocument();
  });

  it("links to the provided href", () => {
    render(<QuickAction href="/booking" icon={<span>IC</span>} label="Book" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/booking");
  });

  it("applies target and rel for external links", () => {
    render(
      <QuickAction
        href="https://external.com"
        icon={<span>IC</span>}
        label="External"
        linkTarget="_blank"
        linkRel="noopener noreferrer"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not set target or rel by default", () => {
    render(<QuickAction href="/test" icon={<span>IC</span>} label="Test" />);
    const link = screen.getByRole("link");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });
});
