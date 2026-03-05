import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServiceSelector } from "../ServiceSelector";
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

describe("ServiceSelector", () => {
  it("renders loading skeleton when isLoading", () => {
    const { container } = render(
      <ServiceSelector
        services={[]}
        selectedService={null}
        onSelect={vi.fn()}
        isLoading
      />,
    );
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("renders empty state when no services", () => {
    render(
      <ServiceSelector
        services={[]}
        selectedService={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/Nenhum serviço disponível/)).toBeInTheDocument();
  });

  it("renders service names, prices, and durations", () => {
    render(
      <ServiceSelector
        services={services}
        selectedService={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByText("Barba")).toBeInTheDocument();
  });

  it("renders service description when available", () => {
    render(
      <ServiceSelector
        services={services}
        selectedService={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Corte clássico")).toBeInTheDocument();
  });

  it("calls onSelect when a service card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ServiceSelector
        services={services}
        selectedService={null}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByText("Corte"));
    expect(onSelect).toHaveBeenCalledWith(services[0]);
  });
});
