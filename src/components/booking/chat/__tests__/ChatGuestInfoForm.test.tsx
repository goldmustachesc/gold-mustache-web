import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatGuestInfoForm } from "../ChatGuestInfoForm";

describe("ChatGuestInfoForm", () => {
  it("renders name and phone inputs", () => {
    render(<ChatGuestInfoForm onSubmit={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Nome para o agendamento"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("WhatsApp")).toBeInTheDocument();
  });

  it("shows validation error for short name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatGuestInfoForm onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("Nome para o agendamento"),
      "A",
    );
    await user.type(screen.getByPlaceholderText("WhatsApp"), "11999999999");
    await user.click(screen.getByText("Continuar para revisão"));

    expect(screen.getByText("Nome muito curto")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid phone", async () => {
    const user = userEvent.setup();
    render(<ChatGuestInfoForm onSubmit={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText("Nome para o agendamento"),
      "João Silva",
    );
    await user.type(screen.getByPlaceholderText("WhatsApp"), "123");
    await user.click(screen.getByText("Continuar para revisão"));

    expect(screen.getByText("Telefone inválido")).toBeInTheDocument();
  });

  it("formats phone as user types", async () => {
    const user = userEvent.setup();
    render(<ChatGuestInfoForm onSubmit={vi.fn()} />);

    const phoneInput = screen.getByPlaceholderText("WhatsApp");
    await user.type(phoneInput, "11999999999");

    expect(phoneInput).toHaveValue("(11) 99999-9999");
  });

  it("calls onSubmit with cleaned data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatGuestInfoForm onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText("Nome para o agendamento"),
      "João Silva",
    );
    await user.type(screen.getByPlaceholderText("WhatsApp"), "11999999999");
    await user.click(screen.getByText("Continuar para revisão"));

    expect(onSubmit).toHaveBeenCalledWith({
      clientName: "João Silva",
      clientPhone: "11999999999",
    });
  });

  it("shows loading state", () => {
    render(<ChatGuestInfoForm onSubmit={vi.fn()} isLoading />);
    expect(screen.getByText("Confirmando...")).toBeInTheDocument();
  });

  it("renders custom submit label", () => {
    render(<ChatGuestInfoForm onSubmit={vi.fn()} submitLabel="Enviar" />);
    expect(screen.getByText("Enviar")).toBeInTheDocument();
  });
});
