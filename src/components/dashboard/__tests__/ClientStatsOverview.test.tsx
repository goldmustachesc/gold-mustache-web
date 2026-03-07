import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientStatsOverview } from "../ClientStatsOverview";
import type { ClientStats } from "@/types/dashboard";

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => ({
    bookingHref: "/pt-BR/agendar",
    shouldShowBooking: true,
    isExternal: false,
    isInternal: true,
  }),
}));

const fullStats: ClientStats = {
  nextAppointment: null,
  upcomingCount: 2,
  totalVisits: 10,
  totalSpent: 750.0,
  favoriteBarber: { id: "b1", name: "Carlos", avatarUrl: null, visitCount: 5 },
  favoriteService: { id: "s1", name: "Corte", useCount: 8 },
  lastService: {
    serviceId: "s1",
    serviceName: "Corte",
    barberId: "b1",
    barberName: "Carlos",
  },
};

describe("ClientStatsOverview", () => {
  it("renders total visits count", () => {
    render(<ClientStatsOverview stats={fullStats} locale="pt-BR" />);
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders total spent formatted", () => {
    render(<ClientStatsOverview stats={fullStats} locale="pt-BR" />);
    expect(screen.getByText("R$ 750,00")).toBeInTheDocument();
  });

  it("renders favorite barber name and visit count", () => {
    render(<ClientStatsOverview stats={fullStats} locale="pt-BR" />);
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("5 visitas")).toBeInTheDocument();
  });

  it("renders favorite service name and usage count", () => {
    render(<ClientStatsOverview stats={fullStats} locale="pt-BR" />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("8 vezes")).toBeInTheDocument();
  });

  it("renders quick rebook section with last service info", () => {
    render(<ClientStatsOverview stats={fullStats} locale="pt-BR" />);
    expect(screen.getByText("Repetir último serviço?")).toBeInTheDocument();
    expect(screen.getByText(/Corte com Carlos/)).toBeInTheDocument();
  });

  it("renders view all appointments link with correct locale", () => {
    render(<ClientStatsOverview stats={fullStats} locale="en" />);
    const link = screen.getByText("Ver todos os agendamentos").closest("a");
    expect(link).toHaveAttribute("href", "/en/meus-agendamentos");
  });

  it("hides visit stats when totalVisits is 0", () => {
    const noVisits: ClientStats = {
      ...fullStats,
      totalVisits: 0,
    };
    render(<ClientStatsOverview stats={noVisits} locale="pt-BR" />);
    expect(screen.queryByText("Total Visitas")).not.toBeInTheDocument();
  });

  it("hides favorites section when no favorites", () => {
    const noFavorites: ClientStats = {
      ...fullStats,
      favoriteBarber: null,
      favoriteService: null,
    };
    render(<ClientStatsOverview stats={noFavorites} locale="pt-BR" />);
    expect(screen.queryByText("Seus Favoritos")).not.toBeInTheDocument();
  });

  it("hides rebook section when no lastService", () => {
    const noLastService: ClientStats = {
      ...fullStats,
      lastService: null,
    };
    render(<ClientStatsOverview stats={noLastService} locale="pt-BR" />);
    expect(
      screen.queryByText("Repetir último serviço?"),
    ).not.toBeInTheDocument();
  });
});
