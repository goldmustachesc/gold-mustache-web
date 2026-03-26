import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SlotActionSheet } from "../SlotActionSheet";
import * as useMediaQueryModule from "@/hooks/useMediaQuery";

describe("SlotActionSheet", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    slotStart: "09:00",
    slotEnd: "09:30",
    onSelectTime: vi.fn(),
    onCreateAbsence: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(useMediaQueryModule, "useIsDesktop").mockReturnValue(false);
  });

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

    await waitFor(() => {
      expect(onSelectTime).toHaveBeenCalledWith("09:15");
    });
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

    await waitFor(() => {
      expect(onCreateAbsence).toHaveBeenCalledWith("09:00", "09:30");
    });
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

  it("mostra loading spinner no chip enquanto navega", async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();

    render(<SlotActionSheet {...defaultProps} onSelectTime={onSelectTime} />);

    const chip = screen.getByRole("button", { name: "09:15" });
    await user.click(chip);

    await waitFor(() => {
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  it("desabilita outros chips enquanto um está navegando", async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();

    render(<SlotActionSheet {...defaultProps} onSelectTime={onSelectTime} />);

    await user.click(screen.getByRole("button", { name: "09:15" }));

    const otherChip = screen.getByRole("button", { name: "09:00" });
    expect(otherChip).toBeDisabled();
  });
});

describe("SlotActionSheet - Desktop Mode", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    slotStart: "09:00",
    slotEnd: "09:30",
    onSelectTime: vi.fn(),
    onCreateAbsence: vi.fn(),
  };

  beforeEach(() => {
    vi.spyOn(useMediaQueryModule, "useIsDesktop").mockReturnValue(true);
  });

  it("renderiza Dialog no desktop", () => {
    render(<SlotActionSheet {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Adicionar em 09:00 - 09:30")).toBeInTheDocument();
  });

  it("exibe chips de horário no Dialog", () => {
    render(<SlotActionSheet {...defaultProps} />);
    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:15" })).toBeInTheDocument();
  });

  it("chama onSelectTime corretamente no modo desktop", async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();

    render(<SlotActionSheet {...defaultProps} onSelectTime={onSelectTime} />);

    await user.click(screen.getByRole("button", { name: "09:00" }));

    await waitFor(() => {
      expect(onSelectTime).toHaveBeenCalledWith("09:00");
    });
  });
});
