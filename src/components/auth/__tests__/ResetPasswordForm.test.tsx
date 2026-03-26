import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "../ResetPasswordForm";

const resetState = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  isSuccess: false,
}));

vi.mock("@/hooks/useAuth", () => ({
  useResetPassword: () => ({
    mutate: resetState.mutate,
    isPending: resetState.isPending,
    isSuccess: resetState.isSuccess,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    resetState.mutate.mockClear();
    resetState.isPending = false;
    resetState.isSuccess = false;
  });

  it("submete email para reset", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm locale="pt-BR" />);

    await user.type(screen.getByLabelText(/email/i), "a@b.com");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(resetState.mutate).toHaveBeenCalledWith("a@b.com");
  });

  it("mostra confirmação após sucesso", () => {
    resetState.isSuccess = true;
    render(<ResetPasswordForm locale="pt-BR" />);

    expect(screen.getByText(/email enviado/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /voltar para login/i }),
    ).toHaveAttribute("href", "/pt-BR/login");
  });
});
