import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BarberSelector } from "../BarberSelector";
import type { BarberData } from "@/types/booking";

const barbers: BarberData[] = [
  { id: "b-1", name: "Carlos", avatarUrl: null },
  { id: "b-2", name: "João", avatarUrl: "https://example.com/joao.jpg" },
];

describe("BarberSelector", () => {
  it("renders loading skeleton when isLoading", () => {
    const { container } = render(
      <BarberSelector
        barbers={[]}
        selectedBarber={null}
        onSelect={vi.fn()}
        isLoading
      />,
    );
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });

  it("renders empty state when no barbers", () => {
    render(
      <BarberSelector barbers={[]} selectedBarber={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText(/Nenhum barbeiro disponível/)).toBeInTheDocument();
  });

  it("renders barber names", () => {
    render(
      <BarberSelector
        barbers={barbers}
        selectedBarber={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
  });

  it("calls onSelect when a barber card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <BarberSelector
        barbers={barbers}
        selectedBarber={null}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByText("Carlos"));
    expect(onSelect).toHaveBeenCalledWith(barbers[0]);
  });

  it("renders avatar image when avatarUrl is provided", () => {
    render(
      <BarberSelector
        barbers={barbers}
        selectedBarber={null}
        onSelect={vi.fn()}
      />,
    );
    const img = screen.getByAltText("João");
    expect(img).toBeInTheDocument();
  });
});
