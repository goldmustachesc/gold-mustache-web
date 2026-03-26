import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarberStatsCards } from "../BarberStatsCards";

describe("BarberStatsCards", () => {
  it("renders today appointment count", () => {
    render(
      <BarberStatsCards
        todayCount={5}
        todayRevenue={250}
        weekCount={20}
        weekRevenue={1000}
      />,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders today revenue formatted as BRL", () => {
    render(
      <BarberStatsCards
        todayCount={3}
        todayRevenue={150.5}
        weekCount={10}
        weekRevenue={500}
      />,
    );
    expect(screen.getByText("R$ 150,50")).toBeInTheDocument();
  });

  it("renders week appointment count", () => {
    render(
      <BarberStatsCards
        todayCount={2}
        todayRevenue={100}
        weekCount={15}
        weekRevenue={750}
      />,
    );
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders week revenue formatted as BRL", () => {
    render(
      <BarberStatsCards
        todayCount={1}
        todayRevenue={50}
        weekCount={8}
        weekRevenue={1250.75}
      />,
    );
    expect(screen.getByText("R$ 1.250,75")).toBeInTheDocument();
  });

  it("masks values when hideValues is true", () => {
    render(
      <BarberStatsCards
        todayCount={5}
        todayRevenue={250}
        weekCount={20}
        weekRevenue={1000}
        hideValues
      />,
    );
    const masked = screen.getAllByText("R$ ***,**");
    expect(masked).toHaveLength(2);
    expect(screen.queryByText("R$ 250,00")).not.toBeInTheDocument();
    expect(screen.queryByText("R$ 1.000,00")).not.toBeInTheDocument();
  });

  it("renders section labels", () => {
    render(
      <BarberStatsCards
        todayCount={0}
        todayRevenue={0}
        weekCount={0}
        weekRevenue={0}
      />,
    );
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("Esta semana")).toBeInTheDocument();
  });

  it("handles zero values", () => {
    render(
      <BarberStatsCards
        todayCount={0}
        todayRevenue={0}
        weekCount={0}
        weekRevenue={0}
      />,
    );
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(2);
  });
});
