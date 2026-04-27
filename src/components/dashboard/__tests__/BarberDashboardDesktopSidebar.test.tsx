import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BarberDashboardDesktopSidebar } from "../BarberDashboardDesktopSidebar";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("BarberDashboardDesktopSidebar", () => {
  it("renderiza métricas operacionais úteis para a tela maior", () => {
    render(
      <BarberDashboardDesktopSidebar
        locale="pt-BR"
        absencesPageHref="/pt-BR/barbeiro/ausencias?date=2026-04-02"
        dailyAppointmentsCount={3}
        availableSlotCount={4}
        dayRevenue={180}
        weekRevenue={700}
        hideValues={false}
        hasPartialAbsences={false}
        hasFullDayAbsence={false}
        isDayOff={false}
        hasConfiguredWorkingHours={true}
      />,
    );

    expect(screen.getByText("Mesa de operação")).toBeInTheDocument();
    expect(screen.getByText("Atendimentos do dia")).toBeInTheDocument();
    expect(screen.getByText("Intervalos livres")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("180,00")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("700,00")),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Atendimentos do dia").closest("div")?.parentElement
        ?.parentElement?.className,
    ).toContain("grid-cols-1");
    expect(
      screen.getByText("Atendimentos do dia").closest("div")?.parentElement
        ?.parentElement?.className,
    ).toContain("lg:grid-cols-2");
  });

  it("mascara receitas quando hideValues está ativo", () => {
    render(
      <BarberDashboardDesktopSidebar
        locale="pt-BR"
        absencesPageHref="/pt-BR/barbeiro/ausencias?date=2026-04-02"
        dailyAppointmentsCount={3}
        availableSlotCount={4}
        dayRevenue={180}
        weekRevenue={700}
        hideValues
        hasPartialAbsences={false}
        hasFullDayAbsence={false}
        isDayOff={false}
        hasConfiguredWorkingHours={true}
      />,
    );

    expect(screen.getAllByText("R$ ***,**")).toHaveLength(2);
  });

  it("exibe aviso contextual quando existem horários bloqueados por ausência", () => {
    render(
      <BarberDashboardDesktopSidebar
        locale="pt-BR"
        absencesPageHref="/pt-BR/barbeiro/ausencias?date=2026-04-02"
        dailyAppointmentsCount={3}
        availableSlotCount={4}
        dayRevenue={180}
        weekRevenue={700}
        hideValues={false}
        hasPartialAbsences
        hasFullDayAbsence={false}
        isDayOff={false}
        hasConfiguredWorkingHours={true}
      />,
    );

    expect(
      screen.getByText("Existem horários bloqueados por ausência neste dia."),
    ).toBeInTheDocument();
  });

  it("renderiza atalhos com descrições voltadas ao operacional", () => {
    render(
      <BarberDashboardDesktopSidebar
        locale="pt-BR"
        absencesPageHref="/pt-BR/barbeiro/ausencias?date=2026-04-02"
        dailyAppointmentsCount={3}
        availableSlotCount={4}
        dayRevenue={180}
        weekRevenue={700}
        hideValues={false}
        hasPartialAbsences={false}
        hasFullDayAbsence={false}
        isDayOff={false}
        hasConfiguredWorkingHours={true}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Agendar cliente/i }),
    ).toHaveAttribute("href", "/pt-BR/barbeiro/agendar");
    expect(screen.getByText("Criar novo horário")).toBeInTheDocument();
    expect(screen.getByText("Histórico e retorno")).toBeInTheDocument();
    expect(screen.getByText("Bloquear período")).toBeInTheDocument();
    expect(screen.getByText("Ajustar expediente")).toBeInTheDocument();
  });

  it("reforça contraste da lateral para dark mode sem abandonar o sistema de bordas", () => {
    render(
      <BarberDashboardDesktopSidebar
        locale="pt-BR"
        absencesPageHref="/pt-BR/barbeiro/ausencias?date=2026-04-02"
        dailyAppointmentsCount={3}
        availableSlotCount={4}
        dayRevenue={180}
        weekRevenue={700}
        hideValues={false}
        hasPartialAbsences={false}
        hasFullDayAbsence={false}
        isDayOff={false}
        hasConfiguredWorkingHours={true}
      />,
    );

    expect(
      screen.getByTestId("barber-dashboard-desktop-sidebar").className,
    ).toContain("dark:bg-card/75");
    expect(
      screen.getByTestId("barber-dashboard-desktop-sidebar").className,
    ).toContain("dark:border-border/90");
  });
});
