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

  it("exibe input de horário exato com o início do intervalo como valor padrão", () => {
    render(<SlotActionSheet {...defaultProps} />);
    const input = screen.getByLabelText(
      "Horário de início",
    ) as HTMLInputElement;
    expect(input.value).toBe("09:00");
    expect(input.min).toBe("09:00");
    expect(input.max).toBe("09:29");
  });

  it("chama onSelectTime com o horário exato escolhido", async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();

    render(<SlotActionSheet {...defaultProps} onSelectTime={onSelectTime} />);

    await user.clear(screen.getByLabelText("Horário de início"));
    await user.type(screen.getByLabelText("Horário de início"), "09:14");
    await user.click(screen.getByRole("button", { name: /usar horário/i }));

    await waitFor(() => {
      expect(onSelectTime).toHaveBeenCalledWith("09:14");
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

  it("ajusta o max do input para um minuto antes do fim do intervalo", () => {
    render(
      <SlotActionSheet {...defaultProps} slotStart="09:00" slotEnd="10:00" />,
    );
    expect(
      (screen.getByLabelText("Horário de início") as HTMLInputElement).max,
    ).toBe("09:59");
  });

  it("não renderiza quando open é false", () => {
    render(<SlotActionSheet {...defaultProps} open={false} />);
    expect(
      screen.queryByText("Adicionar em 09:00 - 09:30"),
    ).not.toBeInTheDocument();
  });

  it("mostra loading spinner no botão principal enquanto navega", async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();

    render(<SlotActionSheet {...defaultProps} onSelectTime={onSelectTime} />);

    await user.click(screen.getByRole("button", { name: /usar horário/i }));

    await waitFor(() => {
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  it("desabilita o input e o botão de bloquear enquanto navega", async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();

    render(<SlotActionSheet {...defaultProps} onSelectTime={onSelectTime} />);

    await user.click(screen.getByRole("button", { name: /usar horário/i }));

    expect(screen.getByLabelText("Horário de início")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /bloquear este intervalo/i }),
    ).toBeDisabled();
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

  it("exibe o input de horário no Dialog", () => {
    render(<SlotActionSheet {...defaultProps} />);
    expect(screen.getByLabelText("Horário de início")).toBeInTheDocument();
  });

  it("chama onSelectTime corretamente no modo desktop", async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();

    render(<SlotActionSheet {...defaultProps} onSelectTime={onSelectTime} />);

    await user.clear(screen.getByLabelText("Horário de início"));
    await user.type(screen.getByLabelText("Horário de início"), "09:12");
    await user.click(screen.getByRole("button", { name: /usar horário/i }));

    await waitFor(() => {
      expect(onSelectTime).toHaveBeenCalledWith("09:12");
    });
  });
});
