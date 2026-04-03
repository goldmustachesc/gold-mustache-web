import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BarberDashboardHero } from "../BarberDashboardHero";
import type { OperationalScheduleSlot } from "../buildDailyOperationalModel";

const baseSlot: OperationalScheduleSlot = {
  time: "10:15",
  endTime: "10:45",
  appointment: null,
  isAvailable: true,
  isBlockedByAbsence: false,
  absenceReason: null,
};

const mockAppointment = {
  id: "apt-1",
  date: "2026-04-08",
  startTime: "09:30",
  endTime: "10:15",
  status: "CONFIRMED" as const,
  updatedAt: "2026-04-08T09:00:00.000Z",
  createdAt: "2026-04-08T09:00:00.000Z",
  service: { id: "s1", name: "Corte + Barba", duration: 45, price: 95 },
  client: { id: "c1", fullName: "Carlos Santos", phone: null },
  guestClient: null,
  barber: { id: "b1", name: "B", avatarUrl: null },
};

describe("BarberDashboardHero", () => {
  it("mostra o próximo cliente e ação segura quando há atendimento futuro", () => {
    render(
      <BarberDashboardHero
        hideValues={false}
        hero={{
          kind: "next-appointment",
          primaryTime: "09:30",
          appointmentId: "apt-1",
        }}
        firstAvailableSlot={null}
        focusedAppointment={mockAppointment}
        locale="pt-BR"
        selectedDateStr="2026-04-08"
        viewingToday
        hasConfiguredWorkingHours
      />,
    );

    expect(screen.getByText("Próximo cliente")).toBeInTheDocument();
    expect(screen.getByText("Carlos Santos")).toBeInTheDocument();
    expect(screen.getByText("Corte + Barba")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver agenda do dia" }),
    ).toBeInTheDocument();
  });

  it("mostra lacuna acionável com CTA de preencher horário", () => {
    render(
      <BarberDashboardHero
        hideValues={false}
        hero={{
          kind: "available-slot",
          primaryTime: "10:15",
          appointmentId: null,
        }}
        firstAvailableSlot={baseSlot}
        focusedAppointment={null}
        locale="pt-BR"
        selectedDateStr="2026-04-08"
        viewingToday
        hasConfiguredWorkingHours
      />,
    );

    expect(screen.getByText("Horário vago")).toBeInTheDocument();
    expect(screen.getByText("10:15 – 10:45")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Preencher horário" }),
    ).toHaveAttribute(
      "href",
      "/pt-BR/barbeiro/agendar?date=2026-04-08&time=10%3A15",
    );
  });

  it("em atendimento atual sem dados do agendamento, oferece Ver agenda do dia como fallback", () => {
    render(
      <BarberDashboardHero
        hideValues={false}
        hero={{
          kind: "current-appointment",
          primaryTime: "09:30",
          appointmentId: "apt-desconhecido",
        }}
        firstAvailableSlot={null}
        focusedAppointment={null}
        locale="pt-BR"
        selectedDateStr="2026-04-08"
        viewingToday
        hasConfiguredWorkingHours
      />,
    );

    expect(screen.getByText("Agora")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver agenda do dia" }),
    ).toHaveAttribute("href", "#agenda-do-dia");
    expect(
      screen.queryByRole("link", { name: "Ver atendimento" }),
    ).not.toBeInTheDocument();
  });

  it("oculta nome e serviço quando hideValues é true", () => {
    render(
      <BarberDashboardHero
        hideValues
        hero={{
          kind: "next-appointment",
          primaryTime: "09:30",
          appointmentId: "apt-1",
        }}
        firstAvailableSlot={null}
        focusedAppointment={mockAppointment}
        locale="pt-BR"
        selectedDateStr="2026-04-08"
        viewingToday
        hasConfiguredWorkingHours
      />,
    );

    expect(screen.queryByText("Carlos Santos")).not.toBeInTheDocument();
    expect(screen.queryByText("Corte + Barba")).not.toBeInTheDocument();
    expect(screen.getByText("Nome oculto")).toBeInTheDocument();
    expect(screen.getByText("Serviço oculto")).toBeInTheDocument();
  });

  it("expõe Nova Ausência e ocultar valores no menu contextual do hero (mobile)", async () => {
    const user = userEvent.setup();
    const onToggleHideValues = vi.fn();

    render(
      <BarberDashboardHero
        hideValues={false}
        hero={{
          kind: "free-day",
          primaryTime: null,
          appointmentId: null,
        }}
        firstAvailableSlot={null}
        focusedAppointment={null}
        locale="pt-BR"
        selectedDateStr="2026-04-08"
        viewingToday
        hasConfiguredWorkingHours
        absencesHref="/pt-BR/barbeiro/ausencias?date=2026-04-08"
        onToggleHideValues={onToggleHideValues}
      />,
    );

    expect(
      screen.getByTestId("barber-dashboard-hero-mobile-actions"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mais ações" }));

    const absenceLink = screen.getByRole("menuitem", {
      name: /Nova Ausência/i,
    });
    expect(absenceLink).toHaveAttribute(
      "href",
      "/pt-BR/barbeiro/ausencias?date=2026-04-08",
    );

    await user.click(
      screen.getByRole("menuitem", { name: /Ocultar Valores/i }),
    );
    expect(onToggleHideValues).toHaveBeenCalledTimes(1);
  });

  it("reforça a superfície do hero para dark mode com contraste de borda e fundo", () => {
    render(
      <BarberDashboardHero
        hideValues={false}
        hero={{
          kind: "free-day",
          primaryTime: null,
          appointmentId: null,
        }}
        firstAvailableSlot={null}
        focusedAppointment={null}
        locale="pt-BR"
        selectedDateStr="2026-04-08"
        viewingToday
        hasConfiguredWorkingHours
      />,
    );

    expect(screen.getByTestId("barber-dashboard-hero").className).toContain(
      "dark:border-primary/40",
    );
    expect(screen.getByTestId("barber-dashboard-hero").className).toContain(
      "dark:to-primary/12",
    );
  });
});
