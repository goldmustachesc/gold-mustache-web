import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptySlot } from "../EmptySlot";

describe("EmptySlot", () => {
  describe("slot disponível com ação", () => {
    it("exibe o intervalo de tempo", () => {
      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={false}
          absenceReason={null}
          onOpenSheet={vi.fn()}
        />,
      );
      expect(screen.getByText("09:00 - 09:30")).toBeInTheDocument();
    });

    it("exibe label Disponível", () => {
      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={false}
          absenceReason={null}
          onOpenSheet={vi.fn()}
        />,
      );
      expect(screen.getByText("Disponível")).toBeInTheDocument();
    });

    it("exibe botão Adicionar", () => {
      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={false}
          absenceReason={null}
          onOpenSheet={vi.fn()}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Adicionar" }),
      ).toBeInTheDocument();
    });

    it("chama onOpenSheet com time e endTime ao clicar em Adicionar", async () => {
      const onOpenSheet = vi.fn();
      const user = userEvent.setup();

      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={false}
          absenceReason={null}
          onOpenSheet={onOpenSheet}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Adicionar" }));

      expect(onOpenSheet).toHaveBeenCalledWith("09:00", "09:30");
      expect(onOpenSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe("slot disponível sem ação", () => {
    it("não exibe botão Adicionar quando onOpenSheet não é fornecido", () => {
      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={false}
          absenceReason={null}
        />,
      );
      expect(
        screen.queryByRole("button", { name: "Adicionar" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("slot bloqueado por ausência", () => {
    it("exibe label Bloqueado por ausência", () => {
      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={true}
          absenceReason={null}
          onOpenSheet={vi.fn()}
        />,
      );
      expect(screen.getByText("Bloqueado por ausência")).toBeInTheDocument();
    });

    it("não exibe botão Adicionar mesmo com onOpenSheet fornecido", () => {
      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={true}
          absenceReason={null}
          onOpenSheet={vi.fn()}
        />,
      );
      expect(
        screen.queryByRole("button", { name: "Adicionar" }),
      ).not.toBeInTheDocument();
    });

    it("exibe motivo da ausência quando fornecido", () => {
      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={true}
          absenceReason="Consulta médica"
          onOpenSheet={vi.fn()}
        />,
      );
      expect(screen.getByText("Consulta médica")).toBeInTheDocument();
    });

    it("não exibe motivo quando absenceReason é null", () => {
      render(
        <EmptySlot
          time="09:00"
          endTime="09:30"
          isBlockedByAbsence={true}
          absenceReason={null}
          onOpenSheet={vi.fn()}
        />,
      );
      expect(screen.queryByText("Motivo:")).not.toBeInTheDocument();
    });
  });
});
