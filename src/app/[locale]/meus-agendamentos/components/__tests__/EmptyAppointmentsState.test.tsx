import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyAppointmentsState } from "../EmptyAppointmentsState";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("EmptyAppointmentsState", () => {
  it("renders the empty message", () => {
    render(<EmptyAppointmentsState locale="pt-BR" />);
    expect(screen.getByText("Nenhum agendamento ainda")).toBeInTheDocument();
  });

  it("renders a description", () => {
    render(<EmptyAppointmentsState locale="pt-BR" />);
    expect(
      screen.getByText(/Que tal marcar seu primeiro horário/),
    ).toBeInTheDocument();
  });

  it("renders a link to book an appointment", () => {
    render(<EmptyAppointmentsState locale="pt-BR" />);
    const link = screen.getByRole("link", { name: /agendar horário/i });
    expect(link).toHaveAttribute("href", "/pt-BR/agendar");
  });
});
