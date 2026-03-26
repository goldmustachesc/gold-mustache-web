import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignupForm } from "../SignupForm";

// Mock useSignUp hook
const mockSignUp = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useSignUp: () => ({
    mutate: mockSignUp,
    isPending: false,
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock GoogleButton
vi.mock("../GoogleButton", () => ({
  GoogleButton: ({ text }: { text: string }) => (
    <button type="button">{text}</button>
  ),
}));

describe("SignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render all form fields", () => {
      render(<SignupForm locale="pt-BR" />);

      expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
      expect(screen.getByLabelText("Telefone (WhatsApp)")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Senha")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirmar senha")).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<SignupForm locale="pt-BR" />);

      expect(
        screen.getByRole("button", { name: "Criar conta" }),
      ).toBeInTheDocument();
    });

    it("should render Google signup button", () => {
      render(<SignupForm locale="pt-BR" />);

      expect(
        screen.getByRole("button", { name: "Cadastrar com Google" }),
      ).toBeInTheDocument();
    });

    it("should render login link with correct locale", () => {
      render(<SignupForm locale="pt-BR" />);

      const loginLink = screen.getByRole("link", { name: "Entrar" });
      expect(loginLink).toHaveAttribute("href", "/pt-BR/login");
    });
  });

  describe("phone formatting", () => {
    it("should format phone number as user types", async () => {
      const user = userEvent.setup();
      render(<SignupForm locale="pt-BR" />);

      const phoneInput = screen.getByLabelText("Telefone (WhatsApp)");

      await user.type(phoneInput, "11999999999");

      expect(phoneInput).toHaveValue("(11) 99999-9999");
    });

    it("should format partial phone number correctly", async () => {
      const user = userEvent.setup();
      render(<SignupForm locale="pt-BR" />);

      const phoneInput = screen.getByLabelText("Telefone (WhatsApp)");

      await user.type(phoneInput, "119");
      expect(phoneInput).toHaveValue("(11) 9");
    });

    it("should limit phone to 11 digits", async () => {
      const user = userEvent.setup();
      render(<SignupForm locale="pt-BR" />);

      const phoneInput = screen.getByLabelText("Telefone (WhatsApp)");

      await user.type(phoneInput, "119999999999999");

      expect(phoneInput).toHaveValue("(11) 99999-9999");
    });
  });

  describe("form validation", () => {
    it("should disable submit button when form is empty", () => {
      render(<SignupForm locale="pt-BR" />);

      const submitButton = screen.getByRole("button", { name: "Criar conta" });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when all fields are filled", async () => {
      const user = userEvent.setup();
      render(<SignupForm locale="pt-BR" />);

      await user.type(screen.getByLabelText("Nome completo"), "João Silva");
      await user.type(
        screen.getByLabelText("Telefone (WhatsApp)"),
        "11999999999",
      );
      await user.type(screen.getByLabelText("Email"), "joao@example.com");
      await user.type(screen.getByLabelText("Senha"), "123456");
      await user.type(screen.getByLabelText("Confirmar senha"), "123456");

      const submitButton = screen.getByRole("button", { name: "Criar conta" });
      expect(submitButton).not.toBeDisabled();
    });

    it("should show error for short password", async () => {
      const user = userEvent.setup();
      render(<SignupForm locale="pt-BR" />);

      // Fill all required fields with valid data except password
      await user.type(screen.getByLabelText("Nome completo"), "João Silva");
      await user.type(
        screen.getByLabelText("Telefone (WhatsApp)"),
        "11999999999",
      );
      await user.type(screen.getByLabelText("Email"), "joao@example.com");
      await user.type(screen.getByLabelText("Senha"), "12345");
      await user.type(screen.getByLabelText("Confirmar senha"), "12345");

      const submitButton = screen.getByRole("button", { name: "Criar conta" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Mínimo 6 caracteres")).toBeInTheDocument();
      });
    });

    it("should show error when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<SignupForm locale="pt-BR" />);

      // Fill all required fields with valid data except confirmPassword
      await user.type(screen.getByLabelText("Nome completo"), "João Silva");
      await user.type(
        screen.getByLabelText("Telefone (WhatsApp)"),
        "11999999999",
      );
      await user.type(screen.getByLabelText("Email"), "joao@example.com");
      await user.type(screen.getByLabelText("Senha"), "123456");
      await user.type(screen.getByLabelText("Confirmar senha"), "654321");

      const submitButton = screen.getByRole("button", { name: "Criar conta" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Senhas não conferem")).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("should call signUp with form data on valid submission", async () => {
      const user = userEvent.setup();
      render(<SignupForm locale="pt-BR" />);

      const fullNameInput = screen.getByLabelText("Nome completo");
      const phoneInput = screen.getByLabelText("Telefone (WhatsApp)");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Senha");
      const confirmPasswordInput = screen.getByLabelText("Confirmar senha");

      await user.type(fullNameInput, "João Silva");
      await user.type(phoneInput, "11999999999");
      await user.type(emailInput, "joao@example.com");
      await user.type(passwordInput, "123456");
      await user.type(confirmPasswordInput, "123456");

      const submitButton = screen.getByRole("button", { name: "Criar conta" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          fullName: "João Silva",
          phone: "(11) 99999-9999",
          email: "joao@example.com",
          password: "123456",
          confirmPassword: "123456",
        });
      });
    });

    it("should not call signUp when form is empty (button disabled)", () => {
      render(<SignupForm locale="pt-BR" />);

      const submitButton = screen.getByRole("button", { name: "Criar conta" });
      expect(submitButton).toBeDisabled();
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });
});
