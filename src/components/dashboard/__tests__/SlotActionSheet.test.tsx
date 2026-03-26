import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SlotActionSheet } from "../SlotActionSheet";

describe("SlotActionSheet", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    slotStart: "09:00",
    slotEnd: "09:30",
    onSelectTime: vi.fn(),
    onCreateAbsence: vi.fn(),
  };

  it("exibe o título com o intervalo correto", () => {
    render(<SlotActionSheet {...defaultProps} />);
    expect(screen.getByText("Adicionar em 09:00 - 09:30")).toBeInTheDocument();
  });

  it("exibe chips de 15 min para bloco de 30 min", () => {
    render(<SlotActionSheet {...defaultProps} />);
    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:15" })).toBeInTheDocument();
  });

  it("exibe apenas os inícios dentro do bloco, não o fim", () => {
    render(<SlotActionSheet {...defaultProps} />);
    expect(
      screen.queryByRole("button", { name: "09:30" }),
    ).not.toBeInTheDocument();
  });

  it("chama onSelectTime com o horário correto ao clicar em chip", async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();

    render(<SlotActionSheet {...defaultProps} onSelectTime={onSelectTime} />);

    await user.click(screen.getByRole("button", { name: "09:15" }));

    expect(onSelectTime).toHaveBeenCalledWith("09:15");
    expect(onSelectTime).toHaveBeenCalledTimes(1);
  });

  it("chama onCreateAbsence com slotStart e slotEnd ao clicar em bloquear", async () => {
    const onCreateAbsence = vi.fn();
    const user = userEvent.setup();

    render(
      <SlotActionSheet {...defaultProps} onCreateAbsence={onCreateAbsence} />,
    );

    await user.click(
      screen.getByRole("button", { name: /bloquear este intervalo/i }),
    );

    expect(onCreateAbsence).toHaveBeenCalledWith("09:00", "09:30");
    expect(onCreateAbsence).toHaveBeenCalledTimes(1);
  });

  it("exibe 4 chips para bloco de 60 min", () => {
    render(
      <SlotActionSheet {...defaultProps} slotStart="09:00" slotEnd="10:00" />,
    );
    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:15" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:30" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:45" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "10:00" }),
    ).not.toBeInTheDocument();
  });

  it("não renderiza quando open é false", () => {
    render(<SlotActionSheet {...defaultProps} open={false} />);
    expect(
      screen.queryByText("Adicionar em 09:00 - 09:30"),
    ).not.toBeInTheDocument();
  });
});
