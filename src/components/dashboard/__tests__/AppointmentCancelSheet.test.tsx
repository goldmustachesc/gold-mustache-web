import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentCancelSheet } from "../AppointmentCancelSheet";
import * as useMediaQueryModule from "@/hooks/useMediaQuery";

describe("AppointmentCancelSheet", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.spyOn(useMediaQueryModule, "useIsDesktop").mockReturnValue(false);
  });

  it("exibe título e campo de motivo", () => {
    render(<AppointmentCancelSheet {...defaultProps} />);
    expect(screen.getByText("Cancelar atendimento")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
    ).toBeInTheDocument();
  });

  it("inclui contexto no texto quando contextLabel é passado", () => {
    render(
      <AppointmentCancelSheet {...defaultProps} contextLabel="João Silva" />,
    );
    expect(
      screen.getByText(/Este cancelamento será registrado para João Silva/i),
    ).toBeInTheDocument();
  });

  it("chama onConfirm com o motivo trimado ao confirmar", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();

    render(<AppointmentCancelSheet {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      { target: { value: "  Cliente desistiu  " } },
    );
    await user.click(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    );

    expect(onConfirm).toHaveBeenCalledWith("Cliente desistiu");
  });

  it("desabilita confirmar sem motivo ou só com espaços", () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    render(<AppointmentCancelSheet {...defaultProps} onConfirm={onConfirm} />);

    expect(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    ).toBeDisabled();

    fireEvent.change(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      { target: { value: "    \t  " } },
    );
    expect(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    ).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("chama onOpenChange(false) ao clicar em Voltar", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <AppointmentCancelSheet {...defaultProps} onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: /^voltar$/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("mostra loading no botão de confirmar quando isPending", () => {
    render(<AppointmentCancelSheet {...defaultProps} isPending />);

    expect(screen.getByTestId("cancel-confirm-loading")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
    ).toBeDisabled();
  });

  it("fecha o sheet apenas quando onConfirm resolve como true", async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();

    render(
      <AppointmentCancelSheet
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      "ok",
    );
    await user.click(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    );

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("mantém o sheet aberto quando onConfirm resolve como false", async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(false);
    const user = userEvent.setup();

    render(
      <AppointmentCancelSheet
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      "motivo preservado",
    );
    await user.click(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByText("Cancelar atendimento")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
    ).toHaveValue("motivo preservado");
  });

  it("renderiza Dialog no desktop", () => {
    vi.spyOn(useMediaQueryModule, "useIsDesktop").mockReturnValue(true);

    render(<AppointmentCancelSheet {...defaultProps} />);

    expect(
      screen.getByRole("dialog", { name: "Cancelar atendimento" }),
    ).toBeInTheDocument();
  });
});
