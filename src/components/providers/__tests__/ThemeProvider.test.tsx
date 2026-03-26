import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../ThemeProvider";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="next-themes-root">{children}</div>
  ),
}));

describe("ThemeProvider", () => {
  it("encaminha props para o ThemeProvider do next-themes", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <span>Conteúdo</span>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("next-themes-root")).toHaveTextContent(
      "Conteúdo",
    );
  });
});
