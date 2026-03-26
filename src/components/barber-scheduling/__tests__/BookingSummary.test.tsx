import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingSummary } from "../BookingSummary";

const PROPS = {
  service: {
    id: "svc-1",
    name: "Corte",
    duration: 30,
    price: 50,
    slug: "corte",
    description: null,
    active: true,
  },
  date: "2025-12-15",
  time: "10:30",
  clientName: "João Silva",
  clientPhone: "11999887766",
};

describe("BookingSummary", () => {
  it("renders service name", () => {
    render(<BookingSummary {...PROPS} />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
  });

  it("renders client name", () => {
    render(<BookingSummary {...PROPS} />);
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(<BookingSummary {...PROPS} />);
    expect(screen.getByText("15/12/2025")).toBeInTheDocument();
  });

  it("renders time", () => {
    render(<BookingSummary {...PROPS} />);
    expect(screen.getByText("10:30")).toBeInTheDocument();
  });

  it("renders duration", () => {
    render(<BookingSummary {...PROPS} />);
    expect(screen.getByText("30 min")).toBeInTheDocument();
  });

  it("renders formatted price", () => {
    render(<BookingSummary {...PROPS} />);
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
  });

  it("renders dash when client name is empty", () => {
    render(<BookingSummary {...PROPS} clientName="" />);
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
