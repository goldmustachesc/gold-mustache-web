import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceSection } from "../ServiceSection";
import type { ServiceData } from "@/types/booking";

const SERVICES: ServiceData[] = [
  {
    id: "svc-1",
    name: "Corte",
    duration: 30,
    price: 50,
    slug: "corte",
    description: null,
    active: true,
  },
  {
    id: "svc-2",
    name: "Barba",
    duration: 20,
    price: 30,
    slug: "barba",
    description: null,
    active: true,
  },
];

describe("ServiceSection", () => {
  it("renders section title", () => {
    render(
      <ServiceSection
        services={SERVICES}
        selectedServiceId=""
        loading={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Serviço")).toBeInTheDocument();
  });

  it("renders select trigger when loading", () => {
    render(
      <ServiceSection
        services={undefined}
        selectedServiceId=""
        loading={true}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Selecione um serviço")).toBeInTheDocument();
  });

  it("renders selected service details when a service is selected", () => {
    render(
      <ServiceSection
        services={SERVICES}
        selectedServiceId="svc-1"
        loading={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Duração: 30 min")).toBeInTheDocument();
  });

  it("does not render details when no service selected", () => {
    render(
      <ServiceSection
        services={SERVICES}
        selectedServiceId=""
        loading={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Duração:/)).not.toBeInTheDocument();
  });
});
