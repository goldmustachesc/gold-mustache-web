import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseBarberFinancialStats = vi.fn();
const mockUseAdminFinancialStats = vi.fn();
const mockGenerateFinancialPDF = vi.fn();

vi.mock("@/hooks/useFinancialStats", () => ({
  useBarberFinancialStats: (...args: unknown[]) =>
    mockUseBarberFinancialStats(...args),
  useAdminFinancialStats: (...args: unknown[]) =>
    mockUseAdminFinancialStats(...args),
  getLastMonths: () => [
    { month: 1, year: 2026, label: "Jan 2026" },
    { month: 2, year: 2026, label: "Fev 2026" },
    { month: 3, year: 2026, label: "Mar 2026" },
  ],
}));

vi.mock("@/lib/pdf/financial-report", () => ({
  generateFinancialPDF: (...args: unknown[]) =>
    mockGenerateFinancialPDF(...args),
}));

vi.mock("@/components/private/PrivateHeaderContext", () => ({
  usePrivateHeader: () => {},
  PrivateHeaderActions: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { FinancialPage } from "../FinancialPage";

const MOCK_STATS = {
  totalRevenue: 5000,
  totalAppointments: 50,
  ticketMedio: 100,
  occupancyRate: 75,
  uniqueClients: 30,
  workedHours: 40,
  availableHours: 60,
  idleHours: 15,
  closedHours: 5,
  dailyRevenue: [{ date: "2026-03-01", value: 500 }],
  serviceBreakdown: [{ name: "Corte", count: 30, revenue: 3000 }],
};

function defaultBarberQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: { stats: MOCK_STATS, barberName: "Carlos" },
    isLoading: false,
    error: null,
    ...overrides,
  };
}

function defaultAdminQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      stats: MOCK_STATS,
      barberName: "",
      barbers: [{ id: "b-1", name: "Carlos" }],
    },
    isLoading: false,
    error: null,
    ...overrides,
  };
}

describe("FinancialPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBarberFinancialStats.mockReturnValue(defaultBarberQuery());
    mockUseAdminFinancialStats.mockReturnValue(defaultAdminQuery());
  });

  it("renders loading state", () => {
    mockUseBarberFinancialStats.mockReturnValue(
      defaultBarberQuery({ data: undefined, isLoading: true }),
    );

    render(<FinancialPage locale="pt" />);

    expect(screen.queryByText("50 atendimentos")).not.toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseBarberFinancialStats.mockReturnValue(
      defaultBarberQuery({
        data: undefined,
        error: new Error("fail"),
      }),
    );

    render(<FinancialPage locale="pt" />);

    expect(screen.getByText("Erro ao carregar dados")).toBeInTheDocument();
  });

  it("renders stats for barber view", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<FinancialPage locale="pt" />);

    expect(screen.getAllByText("50 atendimentos").length).toBeGreaterThan(0);
  });

  it("renders barber selector in admin view", () => {
    render(<FinancialPage locale="pt" isAdmin />);

    expect(screen.getByText("Filtrar por Barbeiro")).toBeInTheDocument();
  });

  it("does not render barber selector in barber view", () => {
    render(<FinancialPage locale="pt" />);

    expect(screen.queryByText("Filtrar por Barbeiro")).not.toBeInTheDocument();
  });

  it("provides an accessible name for the header PDF action", () => {
    render(<FinancialPage locale="pt" />);

    const pdfButton = screen.getByTitle("Gerar PDF");
    expect(pdfButton).toHaveAttribute("aria-label", "Gerar PDF");
  });

  it("triggers PDF generation on button click", async () => {
    mockGenerateFinancialPDF.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<FinancialPage locale="pt" />);

    const pdfButtons = screen.getAllByText("Gerar PDF");
    await user.click(pdfButtons[0]);

    await waitFor(() => {
      expect(mockGenerateFinancialPDF).toHaveBeenCalledWith(
        MOCK_STATS,
        3,
        2026,
        "Carlos",
      );
    });
  });
});
