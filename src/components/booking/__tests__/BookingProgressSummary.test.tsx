import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookingProgressSummary } from "../BookingProgressSummary";

describe("BookingProgressSummary", () => {
  it("renders selected values and edit actions", async () => {
    const user = userEvent.setup();
    const onEditBarber = vi.fn();

    render(
      <BookingProgressSummary
        items={[
          {
            id: "barber",
            label: "Barbeiro",
            value: "Carlos",
            placeholder: "Escolha",
            onEdit: onEditBarber,
            editLabel: "Editar barbeiro",
          },
          {
            id: "service",
            label: "Serviço",
            value: null,
            placeholder: "Escolha o serviço",
          },
        ]}
      />,
    );

    expect(screen.getByText("Resumo do agendamento")).toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("Escolha o serviço")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar barbeiro" }));
    expect(onEditBarber).toHaveBeenCalledOnce();
  });

  describe("horizontal-sticky variant", () => {
    const items = [
      { id: "barber", label: "Barbeiro", value: "Carlos", placeholder: "—" },
      { id: "service", label: "Serviço", value: null, placeholder: "—" },
    ];

    it("renders pill chips for each item", () => {
      render(
        <BookingProgressSummary
          title="Resumo"
          items={items}
          variant="horizontal-sticky"
        />,
      );
      expect(screen.getByText("Carlos")).toBeInTheDocument();
      expect(screen.getAllByText("—")[0]).toBeInTheDocument();
    });

    it("shows edit button only for items with value", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(
        <BookingProgressSummary
          title="Resumo"
          items={[
            {
              id: "barber",
              label: "Barbeiro",
              value: "Carlos",
              placeholder: "—",
              onEdit,
              editLabel: "Editar barbeiro",
            },
            {
              id: "service",
              label: "Serviço",
              value: null,
              placeholder: "—",
              onEdit,
            },
          ]}
          variant="horizontal-sticky"
        />,
      );

      const editBtn = screen.getByRole("button", { name: "Editar barbeiro" });
      await user.click(editBtn);
      expect(onEdit).toHaveBeenCalledOnce();
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("uses aria-label from title prop", () => {
      render(
        <BookingProgressSummary
          title="Progresso"
          items={items}
          variant="horizontal-sticky"
        />,
      );
      expect(
        screen.getByRole("region", { name: "Progresso" }),
      ).toBeInTheDocument();
    });
  });
});
