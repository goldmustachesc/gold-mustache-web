import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../theme-toggle";

const mocks = vi.hoisted(() => ({
  useTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => mocks.useTheme(),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa system como padrão quando theme vem nulo", async () => {
    mocks.useTheme.mockReturnValue({
      theme: null,
      setTheme: vi.fn(),
    });

    render(<ThemeToggle />);

    expect(
      await screen.findByRole("radio", { name: "Seguir tema do sistema" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("permite trocar tema após o mount", async () => {
    const user = userEvent.setup();
    const setTheme = vi.fn();
    mocks.useTheme.mockReturnValue({
      theme: "dark",
      setTheme,
    });

    render(<ThemeToggle />);

    const darkOption = await screen.findByRole("radio", {
      name: "Tema escuro",
    });
    expect(darkOption).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("radio", { name: "Tema claro" }));

    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
