import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatServiceSelector } from "../ChatServiceSelector";
import type { ServiceData } from "@/types/booking";

const services: ServiceData[] = [
  {
    id: "s-1",
    slug: "corte",
    name: "Corte",
    description: "Corte clássico",
    duration: 30,
    price: 50,
    active: true,
  },
  {
    id: "s-2",
    slug: "barba",
    name: "Barba",
    description: null,
    duration: 20,
    price: 30,
    active: true,
  },
];

describe("ChatServiceSelector", () => {
  it("renders loading skeleton when isLoading", () => {
    const { container } = render(
      <ChatServiceSelector services={[]} onSelect={vi.fn()} isLoading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders empty state when no services", () => {
    render(<ChatServiceSelector services={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/Nenhum serviço disponível/)).toBeInTheDocument();
  });

  it("renders service names, prices, and durations", () => {
    render(<ChatServiceSelector services={services} onSelect={vi.fn()} />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
  });

  it("renders description when available", () => {
    render(<ChatServiceSelector services={services} onSelect={vi.fn()} />);
    expect(screen.getByText("Corte clássico")).toBeInTheDocument();
  });

  it("calls onSelect when service clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatServiceSelector services={services} onSelect={onSelect} />);

    await user.click(screen.getByText("Corte"));
    expect(onSelect).toHaveBeenCalledWith(services[0]);
  });
});
