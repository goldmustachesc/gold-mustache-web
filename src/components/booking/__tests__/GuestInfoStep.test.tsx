import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GuestInfoStep } from "../GuestInfoStep";

describe("GuestInfoStep", () => {
  it("renders name and phone fields", () => {
    render(<GuestInfoStep onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telefone/)).toBeInTheDocument();
  });

  it("renders custom submit label", () => {
    render(<GuestInfoStep onSubmit={vi.fn()} submitLabel="Próximo" />);
    expect(screen.getByText("Próximo")).toBeInTheDocument();
  });

  it("shows validation error for short name", async () => {
    const user = userEvent.setup();
    render(<GuestInfoStep onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/Nome/), "A");
    await user.click(screen.getByText("Confirmar Agendamento"));

    expect(
      screen.getByText("Nome deve ter pelo menos 2 caracteres"),
    ).toBeInTheDocument();
  });

  it("shows validation error for invalid phone", async () => {
    const user = userEvent.setup();
    render(<GuestInfoStep onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/Nome/), "João Silva");
    await user.type(screen.getByLabelText(/Telefone/), "123");
    await user.click(screen.getByText("Confirmar Agendamento"));

    expect(
      screen.getByText("Telefone deve ter 10 ou 11 dígitos"),
    ).toBeInTheDocument();
  });

  it("formats phone number as user types", async () => {
    const user = userEvent.setup();
    render(<GuestInfoStep onSubmit={vi.fn()} />);

    const phoneInput = screen.getByLabelText(/Telefone/);
    await user.type(phoneInput, "11999999999");

    expect(phoneInput).toHaveValue("(11) 99999-9999");
  });

  it("calls onSubmit with cleaned data on valid submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GuestInfoStep onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Nome/), "João Silva");
    await user.type(screen.getByLabelText(/Telefone/), "11999999999");
    await user.click(screen.getByText("Confirmar Agendamento"));

    expect(onSubmit).toHaveBeenCalledWith({
      clientName: "João Silva",
      clientPhone: "11999999999",
    });
  });

  it("disables fields when isLoading", () => {
    render(<GuestInfoStep onSubmit={vi.fn()} isLoading />);

    expect(screen.getByLabelText(/Nome/)).toBeDisabled();
    expect(screen.getByLabelText(/Telefone/)).toBeDisabled();
    expect(screen.getByText("Confirmando...")).toBeInTheDocument();
  });
});
