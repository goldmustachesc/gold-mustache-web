import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../LoginForm";

const mockSignIn = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  isPending: false,
}));
const googleButtonSpy = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAuth", () => ({
  useSignIn: () => ({
    mutate: mockSignIn,
    isPending: authState.isPending,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("../GoogleButton", () => ({
  GoogleButton: ({
    text,
    className,
  }: {
    text?: string;
    className?: string;
  }) => {
    googleButtonSpy({ text, className });
    return <button type="button">{text || "Continuar com Google"}</button>;
  },
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isPending = false;
  });

  it("renderiza campos, links e botão social com locale correto", () => {
    render(<LoginForm locale="pt-BR" />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Entrar com Google" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute(
      "href",
      "/pt-BR/signup",
    );
    expect(
      screen.getByRole("link", { name: "Esqueceu a senha?" }),
    ).toHaveAttribute("href", "/pt-BR/reset-password");
    expect(googleButtonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Entrar com Google",
        className: expect.stringContaining("bg-background"),
      }),
    );
  });

  it("habilita submit quando email e senha são preenchidos", async () => {
    const user = userEvent.setup();
    render(<LoginForm locale="pt-BR" />);

    const submitButton = screen.getByRole("button", { name: "Entrar" });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText("Email"), "joao@example.com");
    await user.type(screen.getByLabelText("Senha"), "123456");

    expect(submitButton).not.toBeDisabled();
  });

  it("alterna visibilidade da senha via botão com aria-label", async () => {
    const user = userEvent.setup();
    render(<LoginForm locale="pt-BR" />);

    const passwordInput = screen.getByLabelText("Senha");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen.getByRole("button", { name: "Mostrar senha" });
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Ocultar senha" }),
    ).toBeInTheDocument();
  });

  it("chama signIn com dados válidos", async () => {
    const user = userEvent.setup();
    render(<LoginForm locale="pt-BR" />);

    await user.type(screen.getByLabelText("Email"), "joao@example.com");
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "joao@example.com",
        password: "123456",
      });
    });
  });

  it("mostra erro de validação para senha curta e não envia formulário", async () => {
    const user = userEvent.setup();
    render(<LoginForm locale="pt-BR" />);

    await user.type(screen.getByLabelText("Email"), "joao@example.com");
    await user.type(screen.getByLabelText("Senha"), "123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByText("Mínimo 6 caracteres")).toBeInTheDocument();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("exibe estado de carregamento durante submit pendente", () => {
    authState.isPending = true;
    render(<LoginForm locale="pt-BR" />);

    expect(screen.getByRole("button", { name: "Entrando..." })).toBeDisabled();
  });
});
