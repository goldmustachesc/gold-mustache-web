import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientSearchSection } from "../ClientSearchSection";
import { createRef } from "react";

const baseProps = {
  phone: "",
  name: "",
  selectedClient: null,
  suggestions: [],
  showSuggestions: false,
  loading: false,
  phoneInputRef: createRef<HTMLInputElement>(),
  suggestionsRef: createRef<HTMLDivElement>(),
  onPhoneChange: vi.fn(),
  onNameChange: vi.fn(),
  onSelectClient: vi.fn(),
  onClearSelection: vi.fn(),
  onPhoneFocus: vi.fn(),
};

const MOCK_CLIENT = {
  id: "cl-1",
  fullName: "Carlos Silva",
  phone: "11999887766",
  type: "registered" as const,
  appointmentCount: 5,
};

describe("ClientSearchSection", () => {
  it("renders section title", () => {
    render(<ClientSearchSection {...baseProps} />);
    expect(screen.getByText("Dados do Cliente")).toBeInTheDocument();
  });

  it("renders phone input", () => {
    render(<ClientSearchSection {...baseProps} />);
    expect(screen.getByPlaceholderText("(00) 00000-0000")).toBeInTheDocument();
  });

  it("renders name input", () => {
    render(<ClientSearchSection {...baseProps} />);
    expect(screen.getByPlaceholderText("Nome completo")).toBeInTheDocument();
  });

  it("shows selected client badge when client is selected", () => {
    render(<ClientSearchSection {...baseProps} selectedClient={MOCK_CLIENT} />);
    expect(screen.getByText("Cliente cadastrado")).toBeInTheDocument();
  });

  it("shows clear button when client is selected", () => {
    render(<ClientSearchSection {...baseProps} selectedClient={MOCK_CLIENT} />);
    expect(screen.getByText("Limpar")).toBeInTheDocument();
  });

  it("calls onClearSelection when clear button clicked", async () => {
    const onClear = vi.fn();
    render(
      <ClientSearchSection
        {...baseProps}
        selectedClient={MOCK_CLIENT}
        onClearSelection={onClear}
      />,
    );

    await userEvent.click(screen.getByText("Limpar"));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("renders suggestions dropdown when showSuggestions is true", () => {
    render(
      <ClientSearchSection
        {...baseProps}
        showSuggestions={true}
        suggestions={[MOCK_CLIENT]}
      />,
    );
    expect(screen.getByText("Carlos Silva")).toBeInTheDocument();
  });

  it("calls onSelectClient when suggestion clicked", async () => {
    const onSelect = vi.fn();
    render(
      <ClientSearchSection
        {...baseProps}
        showSuggestions={true}
        suggestions={[MOCK_CLIENT]}
        onSelectClient={onSelect}
      />,
    );

    await userEvent.click(screen.getByText("Carlos Silva"));
    expect(onSelect).toHaveBeenCalledWith(MOCK_CLIENT);
  });

  it("shows appointment count in selected client info", () => {
    render(<ClientSearchSection {...baseProps} selectedClient={MOCK_CLIENT} />);
    expect(screen.getByText(/5 agendamentos anteriores/)).toBeInTheDocument();
  });

  it("formats phone number in suggestions using formatPhoneDisplay", () => {
    render(
      <ClientSearchSection
        {...baseProps}
        showSuggestions={true}
        suggestions={[MOCK_CLIENT]}
      />,
    );
    expect(screen.getByText("(11) 99988-7766")).toBeInTheDocument();
  });
});
