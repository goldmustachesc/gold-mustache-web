import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatBarberSelector } from "../chat/ChatBarberSelector";
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

  it("renders barber names", () => {
    render(<ChatBarberSelector barbers={barbers} onSelect={vi.fn()} />);
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
  });

  it("does not render 'Qualquer barbeiro' option", () => {
    render(<ChatBarberSelector barbers={barbers} onSelect={vi.fn()} />);
    expect(screen.queryByText("Qualquer barbeiro")).not.toBeInTheDocument();
  });

  it("calls onSelect with the barber data when a barber card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatBarberSelector barbers={barbers} onSelect={onSelect} />);
    await user.click(screen.getByText("Carlos"));
    expect(onSelect).toHaveBeenCalledWith(barbers[0]);
  });
});
