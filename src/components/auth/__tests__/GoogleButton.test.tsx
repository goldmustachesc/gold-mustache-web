import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleButton } from "../GoogleButton";

const mockSignInWithGoogle = vi.hoisted(() => vi.fn());
const hookState = vi.hoisted(() => ({
  isPending: false,
}));

vi.mock("@/hooks/useAuth", () => ({
  useSignInWithGoogle: () => ({
    mutate: mockSignInWithGoogle,
    isPending: hookState.isPending,
  }),
}));

describe("GoogleButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.isPending = false;
  });

  it("renderiza texto padrão e dispara login Google ao clicar", async () => {
    const user = userEvent.setup();
    render(<GoogleButton />);

    const button = screen.getByRole("button", { name: "Continuar com Google" });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("aceita texto customizado e className adicional", () => {
    render(<GoogleButton text="Entrar com Google" className="custom-style" />);

    const button = screen.getByRole("button", { name: "Entrar com Google" });
    expect(button).toHaveClass("custom-style");
  });

  it("mostra loading e desabilita clique quando pendente", async () => {
    hookState.isPending = true;
    const user = userEvent.setup();
    render(<GoogleButton text="Entrar com Google" />);

    const button = screen.getByRole("button", { name: "Carregando..." });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
  });
});
