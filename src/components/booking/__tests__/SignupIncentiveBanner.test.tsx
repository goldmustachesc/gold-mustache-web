import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignupIncentiveBanner } from "../SignupIncentiveBanner";

describe("SignupIncentiveBanner", () => {
  it("renders full variant by default", () => {
    render(<SignupIncentiveBanner locale="pt-BR" />);
    expect(screen.getByText(/Crie sua conta e ganhe/)).toBeInTheDocument();
    expect(screen.getByText("Criar conta grátis")).toBeInTheDocument();
  });

  it("renders compact variant", () => {
    render(<SignupIncentiveBanner locale="pt-BR" variant="compact" />);
    expect(screen.getByText(/Sobrancelha grátis/)).toBeInTheDocument();
    expect(screen.getByText("Criar conta")).toBeInTheDocument();
  });

  it("uses correct locale in signup link", () => {
    render(<SignupIncentiveBanner locale="en" variant="compact" />);
    const link = screen.getByText("Criar conta").closest("a");
    expect(link).toHaveAttribute("href", "/en/signup");
  });
});
