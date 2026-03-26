import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinancialStats } from "@/types/financial";
import { generateFinancialPDF } from "../financial-report";

const pdfMocks = vi.hoisted(() => ({
  save: vi.fn(),
}));

let autoTableCall = 0;

vi.mock("jspdf", () => {
  class JsPDFStub {
    internal = {
      pageSize: {
        getWidth: () => 200,
        getHeight: () => 300,
      },
    };
    setFillColor = vi.fn();
    rect = vi.fn();
    setTextColor = vi.fn();
    setFontSize = vi.fn();
    setFont = vi.fn();
    text = vi.fn();
    addPage = vi.fn();
    getNumberOfPages = () => 1;
    setPage = vi.fn();
    save = (...args: unknown[]) => pdfMocks.save(...args);
  }
  return { jsPDF: JsPDFStub };
});

vi.mock("jspdf-autotable", () => ({
  default: vi.fn((doc: { lastAutoTable?: { finalY: number } }) => {
    autoTableCall += 1;
    doc.lastAutoTable = { finalY: autoTableCall === 1 ? 210 : 120 };
  }),
}));

const baseStats: FinancialStats = {
  totalRevenue: 1500,
  totalAppointments: 10,
  dailyRevenue: [{ date: "2025-03-01", revenue: 100, count: 2 }],
  serviceBreakdown: [
    {
      serviceId: "s1",
      name: "Corte",
      count: 5,
      revenue: 750,
    },
  ],
  ticketMedio: 150,
  occupancyRate: 80,
  uniqueClients: 8,
  availableHours: 40,
  workedHours: 32,
  idleHours: 8,
  closedHours: 2,
};

describe("generateFinancialPDF", () => {
  beforeEach(() => {
    pdfMocks.save.mockClear();
    autoTableCall = 0;
  });

  it("gera PDF e chama save com nome sanitizado", async () => {
    await generateFinancialPDF(baseStats, 3, 2025, "Joao Barbosa");

    expect(pdfMocks.save).toHaveBeenCalledWith(
      "relatorio-financeiro-joao-barbosa-3-2025.pdf",
    );
  });

  it("percorre fluxo com receita diária e pode adicionar página", async () => {
    const stats: FinancialStats = {
      ...baseStats,
      dailyRevenue: [
        { date: "2025-03-10", revenue: 50, count: 1 },
        { date: "2025-03-11", revenue: 0, count: 0 },
      ],
    };

    await generateFinancialPDF(stats, 12, 2024, "Ana");

    expect(pdfMocks.save).toHaveBeenCalled();
  });
});
