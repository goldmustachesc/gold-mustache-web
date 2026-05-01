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
});
