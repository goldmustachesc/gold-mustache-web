import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickActions } from "../QuickActions";
import type { ClientStats } from "@/types/dashboard";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

function buildStats(overrides: Partial<ClientStats> = {}): ClientStats {
  return {
    nextAppointment: null,
    upcomingCount: 0,
    totalVisits: 5,
    totalSpent: 250,
    favoriteBarber: null,
    favoriteService: null,
    lastService: null,
    ...overrides,
  };
}

describe("QuickActions", () => {
  it("renders the new appointment CTA link", () => {
    render(<QuickActions locale="pt-BR" />);
    const link = screen.getByRole("link", { name: /agendar horário/i });
    expect(link).toHaveAttribute("href", "/pt-BR/agendar");
  });

  it("does not render favorites when clientStats is undefined", () => {
    render(<QuickActions locale="pt-BR" />);
    expect(screen.queryByText("Barbeiro favorito")).not.toBeInTheDocument();
  });

  it("does not render favorites when no favorites exist", () => {
    render(
      <QuickActions
        locale="pt-BR"
        clientStats={buildStats({ totalVisits: 5 })}
      />,
    );
    expect(screen.queryByText("Barbeiro favorito")).not.toBeInTheDocument();
  });

  it("renders favorite barber when available", () => {
    render(
      <QuickActions
        locale="pt-BR"
        clientStats={buildStats({
          totalVisits: 3,
          favoriteBarber: {
            id: "b-1",
            name: "Carlos",
            avatarUrl: null,
            visitCount: 3,
          },
        })}
      />,
    );
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("renders favorite service when available", () => {
    render(
      <QuickActions
        locale="pt-BR"
        clientStats={buildStats({
          totalVisits: 3,
          favoriteService: { id: "s-1", name: "Corte", useCount: 3 },
        })}
      />,
    );
    expect(screen.getByText("Corte")).toBeInTheDocument();
  });
});
