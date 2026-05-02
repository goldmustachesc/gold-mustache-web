import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatBarberSelector, ANY_BARBER_ID } from "../chat/ChatBarberSelector";
import type { BarberData } from "@/types/booking";

const barbers: BarberData[] = [
  { id: "b-1", name: "Carlos", avatarUrl: null },
  { id: "b-2", name: "João", avatarUrl: "https://example.com/joao.jpg" },
];

describe("ChatBarberSelector", () => {
  it("renders loading skeleton when isLoading", () => {
    const { container } = render(
      <ChatBarberSelector barbers={[]} onSelect={vi.fn()} isLoading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders empty state when no barbers", () => {
    render(<ChatBarberSelector barbers={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/Nenhum barbeiro disponível/)).toBeInTheDocument();
  });

  it("renders 'Qualquer barbeiro' card as first item by default", () => {
    render(<ChatBarberSelector barbers={barbers} onSelect={vi.fn()} />);
    expect(screen.getByText("Qualquer barbeiro")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("Qualquer barbeiro");
  });

  it("calls onSelect with id 'any' when 'Qualquer barbeiro' is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatBarberSelector barbers={barbers} onSelect={onSelect} />);
    await user.click(screen.getByText("Qualquer barbeiro"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: ANY_BARBER_ID }),
    );
  });

  it("does not render 'Qualquer barbeiro' when showAnyBarber is false", () => {
    render(
      <ChatBarberSelector
        barbers={barbers}
        onSelect={vi.fn()}
        showAnyBarber={false}
      />,
    );
    expect(screen.queryByText("Qualquer barbeiro")).not.toBeInTheDocument();
  });

  it("renders barber names after 'Qualquer barbeiro'", () => {
    render(<ChatBarberSelector barbers={barbers} onSelect={vi.fn()} />);
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
  });

  it("calls onSelect with the barber data when a barber card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatBarberSelector barbers={barbers} onSelect={onSelect} />);
    await user.click(screen.getByText("Carlos"));
    expect(onSelect).toHaveBeenCalledWith(barbers[0]);
  });
});
