"use client";

import type { FinancialStats } from "@/types/financial";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getMonthName(month: number): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return months[month - 1] || "";
}

/**
 * Generates a PDF financial report for a barber
 */
export async function generateFinancialPDF(
  stats: FinancialStats,
  month: number,
  year: number,
  barberName: string,
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Header
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setTextColor(255, 191, 0); // Gold color
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("GOLD MUSTACHE", margin, 25);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Financeiro", margin, 35);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(`${getMonthName(month)} ${year}`, margin, 45);

  // Barber name
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.text(barberName, pageWidth - margin, 45, { align: "right" });

  yPosition = 60;

  // Summary Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo do Período", margin, yPosition);
  yPosition += 10;

  // Summary table
  autoTable(doc, {
    startY: yPosition,
    head: [["Métrica", "Valor"]],
    body: [
      ["Faturamento Total", formatCurrency(stats.totalRevenue)],
      ["Total de Atendimentos", String(stats.totalAppointments)],
      ["Ticket Médio", formatCurrency(stats.ticketMedio)],
      ["Taxa de Ocupação", `${stats.occupancyRate}%`],
      ["Clientes Únicos", String(stats.uniqueClients)],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [26, 26, 26],
      textColor: [255, 191, 0],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    margin: { left: margin, right: margin },
  });

  yPosition =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 15;

  // Hours breakdown
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Horas de Trabalho", margin, yPosition);
  yPosition += 10;

  autoTable(doc, {
    startY: yPosition,
    head: [["Tipo", "Horas"]],
    body: [
      ["Horas Disponíveis", `${stats.availableHours} hrs`],
      ["Horas Trabalhadas", `${stats.workedHours} hrs`],
      ["Tempo Ocioso", `${stats.idleHours} hrs`],
      ["Agenda Fechada", `${stats.closedHours} hrs`],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [26, 26, 26],
      textColor: [255, 191, 0],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    margin: { left: margin, right: margin },
  });

  yPosition =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 15;

  // Services breakdown
  if (stats.serviceBreakdown.length > 0) {
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Serviços Realizados", margin, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Serviço", "Quantidade", "Receita"]],
      body: stats.serviceBreakdown.map((service) => [
        service.name,
        String(service.count),
        formatCurrency(service.revenue),
      ]),
      theme: "striped",
      headStyles: {
        fillColor: [26, 26, 26],
        textColor: [255, 191, 0],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      margin: { left: margin, right: margin },
    });

    yPosition =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 15;
  }

  // Daily revenue chart (simplified as table)
  const daysWithRevenue = stats.dailyRevenue.filter((d) => d.revenue > 0);
  if (daysWithRevenue.length > 0) {
    // Check if we need a new page
    if (yPosition > 180) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Faturamento Diário", margin, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [["Data", "Atendimentos", "Receita"]],
      body: daysWithRevenue.map((entry) => {
        const day = entry.date.split("-")[2];
        return [
          `${day}/${String(month).padStart(2, "0")}`,
          String(entry.count),
          formatCurrency(entry.revenue),
        ];
      }),
      theme: "striped",
      headStyles: {
        fillColor: [26, 26, 26],
        textColor: [255, 191, 0],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      margin: { left: margin, right: margin },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
      margin,
      doc.internal.pageSize.getHeight() - 10,
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 10,
      { align: "right" },
    );
  }

  // Save the PDF
  const filename = `relatorio-financeiro-${barberName.toLowerCase().replace(/\s+/g, "-")}-${month}-${year}.pdf`;
  doc.save(filename);
}
