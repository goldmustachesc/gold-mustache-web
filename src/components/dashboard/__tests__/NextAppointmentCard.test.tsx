import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NextAppointmentCard } from "../NextAppointmentCard";

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
}));

vi.mock("@/constants/brand", () => ({
  BRAND: {
    contact: {
      googleMapsUrl: "https://maps.google.com",
      address: "Rua Exemplo, 123",
    },
  },
}));

const appointment = {
  id: "apt-1",
  date: "2026-03-10",
  startTime: "09:00",
  endTime: "09:30",
  service: { id: "s-1", name: "Corte", duration: 30, price: 50 },
  barber: { id: "b-1", name: "Carlos", avatarUrl: null },
};

describe("NextAppointmentCard", () => {
  it("renders service name", () => {
    render(<NextAppointmentCard appointment={appointment} locale="pt-BR" />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
  });

  it("renders barber name", () => {
    render(<NextAppointmentCard appointment={appointment} locale="pt-BR" />);
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(<NextAppointmentCard appointment={appointment} locale="pt-BR" />);
    expect(screen.getByText("10/03/2026")).toBeInTheDocument();
  });

  it("renders time range", () => {
    render(<NextAppointmentCard appointment={appointment} locale="pt-BR" />);
    expect(screen.getByText("09:00 - 09:30")).toBeInTheDocument();
  });

  it("renders details link with correct locale", () => {
    render(<NextAppointmentCard appointment={appointment} locale="en" />);
    const link = screen.getByText("Ver detalhes").closest("a");
    expect(link).toHaveAttribute("href", "/en/meus-agendamentos");
  });

  it("shows address from brand constants", () => {
    render(<NextAppointmentCard appointment={appointment} locale="pt-BR" />);
    expect(screen.getByText("Rua Exemplo, 123")).toBeInTheDocument();
  });

  it("shows service duration and price", () => {
    render(<NextAppointmentCard appointment={appointment} locale="pt-BR" />);
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
    expect(screen.getByText(/50,00/)).toBeInTheDocument();
  });
});
