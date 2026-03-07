import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminOverview } from "../AdminOverview";
import type { AdminStats } from "@/types/dashboard";

const stats: AdminStats = {
  todayAppointments: 8,
  todayRevenue: 450.5,
  weekAppointments: 32,
  weekRevenue: 2100.0,
  activeBarbers: 3,
  totalClients: 150,
};

describe("AdminOverview", () => {
  it("renders today appointments count", () => {
    render(<AdminOverview stats={stats} />);
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders today revenue formatted as BRL currency", () => {
    render(<AdminOverview stats={stats} />);
    expect(screen.getByText("R$ 450,50")).toBeInTheDocument();
  });

  it("renders week appointments count", () => {
    render(<AdminOverview stats={stats} />);
    expect(screen.getByText("32")).toBeInTheDocument();
  });

  it("renders week revenue formatted as BRL currency", () => {
    render(<AdminOverview stats={stats} />);
    expect(screen.getByText("R$ 2.100,00")).toBeInTheDocument();
  });

  it("renders active barbers count", () => {
    render(<AdminOverview stats={stats} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders total clients count", () => {
    render(<AdminOverview stats={stats} />);
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("renders team and clients section heading", () => {
    render(<AdminOverview stats={stats} />);
    expect(screen.getByText("Equipe & Clientes")).toBeInTheDocument();
  });

  it("renders section labels", () => {
    render(<AdminOverview stats={stats} />);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("Receita Hoje")).toBeInTheDocument();
    expect(screen.getByText("Esta Semana")).toBeInTheDocument();
    expect(screen.getByText("Receita Semana")).toBeInTheDocument();
    expect(screen.getByText("Barbeiros Ativos")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
  });

  it("handles zero values", () => {
    const zeroStats: AdminStats = {
      todayAppointments: 0,
      todayRevenue: 0,
      weekAppointments: 0,
      weekRevenue: 0,
      activeBarbers: 0,
      totalClients: 0,
    };
    render(<AdminOverview stats={zeroStats} />);
    const zeroCurrencies = screen.getAllByText("R$ 0,00");
    expect(zeroCurrencies).toHaveLength(2);
  });
});
