import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewPasswordForm } from "../NewPasswordForm";

const mockMutate = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useUpdatePassword: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe("NewPasswordForm", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it("envia nova senha ao submeter formulário válido", async () => {
    const user = userEvent.setup();
    render(<NewPasswordForm />);

    await user.type(screen.getByLabelText("Nova senha"), "secret123");
    await user.type(screen.getByLabelText("Confirmar senha"), "secret123");
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(mockMutate).toHaveBeenCalledWith("secret123");
  });
});
