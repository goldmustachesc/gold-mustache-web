"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePrivateHeader,
  PrivateHeaderActions,
} from "@/components/private/PrivateHeaderContext";
import {
  Loader2,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  Settings,
  Scissors,
  Store,
  Info,
} from "lucide-react";
import {
  useBarberFinancialStats,
  useAdminFinancialStats,
  getLastMonths,
  type BarberOption,
  type AdminFinancialResponse,
} from "@/hooks/useFinancialStats";
import { MonthSelector } from "./MonthSelector";
import { RevenueChart } from "./RevenueChart";
import { ServiceBreakdown } from "./ServiceBreakdown";
import { MetricCards } from "./MetricCards";
import { DetailedMetrics } from "./DetailedMetrics";
import type { FinancialStats } from "@/types/financial";
import Link from "next/link";

interface FinancialPageProps {
  locale: string;
  isAdmin?: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function FinancialPage({ locale, isAdmin = false }: FinancialPageProps) {
  const months = getLastMonths(4);
  const currentMonth = months[months.length - 1];

  const [selectedMonth, setSelectedMonth] = useState(currentMonth.month);
  const [selectedYear, setSelectedYear] = useState(currentMonth.year);
  const [selectedBarberId, setSelectedBarberId] = useState<string | undefined>(
    undefined,
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Use appropriate hook based on role
  const barberQuery = useBarberFinancialStats(selectedMonth, selectedYear);
  const adminQuery = useAdminFinancialStats(
    selectedMonth,
    selectedYear,
    selectedBarberId,
  );

  const query = isAdmin ? adminQuery : barberQuery;
  const { data, isLoading, error } = query;

  const stats: FinancialStats | undefined = data?.stats;
  const barberName = data?.barberName || "";

  // Extract barbers from admin query response
  const barbers: BarberOption[] = isAdmin
    ? ((adminQuery.data as AdminFinancialResponse | undefined)?.barbers ?? [])
    : [];

  usePrivateHeader({
    title: "Faturamento",
    icon: DollarSign,
    backHref: `/${locale}/${isAdmin ? "dashboard" : "barbeiro"}`,
  });

  const handleMonthSelect = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleGeneratePdf = async () => {
    if (!stats) return;

    setIsGeneratingPdf(true);
    try {
      const { generateFinancialPDF } = await import(
        "@/lib/pdf/financial-report"
      );
      await generateFinancialPDF(
        stats,
        selectedMonth,
        selectedYear,
        barberName,
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div>
      <PrivateHeaderActions>
        <Button
          variant="outline"
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf || !stats}
          aria-label="Gerar PDF"
          title="Gerar PDF"
          className="border-border hover:bg-accent"
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 sm:mr-2" />
          )}
          <span className="hidden sm:inline">Gerar PDF</span>
        </Button>
      </PrivateHeaderActions>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block lg:w-3/12 space-y-4">
              {/* Revenue Summary Card */}
              {stats && (
                <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/30 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-sm text-primary font-medium">
                      Receita Total
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stats.totalAppointments} atendimentos
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {stats && (
                <div className="bg-muted rounded-xl border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Resumo do Período
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">
                        Ticket Médio
                      </span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(stats.ticketMedio)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">
                        Ocupação
                      </span>
                      <span className="font-semibold text-foreground">
                        {stats.occupancyRate}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">
                        Clientes
                      </span>
                      <span className="font-semibold text-foreground">
                        {stats.uniqueClients}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">
                        Horas Trabalhadas
                      </span>
                      <span className="font-semibold text-foreground">
                        {stats.workedHours}h
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="bg-muted rounded-xl border border-border p-4">
                <h3 className="font-semibold text-foreground mb-3 text-sm">
                  Outras Configurações
                </h3>
                <div className="space-y-2">
                  {isAdmin ? (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/admin/barbeiros`}>
                          <Users className="h-4 w-4 mr-2" />
                          Barbeiros
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/admin/barbearia/servicos`}>
                          <Scissors className="h-4 w-4 mr-2" />
                          Serviços
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/admin/barbearia/horarios`}>
                          <Clock className="h-4 w-4 mr-2" />
                          Horários
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/admin/barbearia/configuracoes`}>
                          <Settings className="h-4 w-4 mr-2" />
                          Configurações
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Minha Agenda
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/horarios`}>
                          <Clock className="h-4 w-4 mr-2" />
                          Meus Horários
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/ausencias`}>
                          <Store className="h-4 w-4 mr-2" />
                          Ausências
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-primary text-sm mb-1">
                      Relatório PDF
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Clique em &quot;Gerar PDF&quot; para exportar um relatório
                      completo do período selecionado.
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:w-9/12 space-y-6">
              {/* Month Selector */}
              <div className="bg-muted rounded-xl border border-border p-4">
                <MonthSelector
                  months={months}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onSelect={handleMonthSelect}
                />
              </div>

              {/* Admin: Barber Selector */}
              {isAdmin && barbers.length > 0 && (
                <div className="bg-muted rounded-xl border border-border p-4">
                  <span className="text-sm text-muted-foreground mb-2 block">
                    Filtrar por Barbeiro
                  </span>
                  <Select
                    value={selectedBarberId || "all"}
                    onValueChange={(value) =>
                      setSelectedBarberId(value === "all" ? undefined : value)
                    }
                  >
                    <SelectTrigger className="w-full max-w-xs bg-background border-border text-foreground focus:border-primary/50 focus:ring-primary/20">
                      <SelectValue placeholder="Selecione o barbeiro" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem
                        value="all"
                        className="text-foreground hover:bg-accent focus:bg-accent"
                      >
                        Todos os Barbeiros
                      </SelectItem>
                      {barbers.map((barber) => (
                        <SelectItem
                          key={barber.id}
                          value={barber.id}
                          className="text-foreground hover:bg-accent focus:bg-accent"
                        >
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Content */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="bg-muted rounded-xl border border-red-500/30 p-8 text-center">
                  <p className="text-red-400 font-medium">
                    Erro ao carregar dados
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Tente novamente mais tarde
                  </p>
                </div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Mobile Revenue Summary */}
                  <div className="lg:hidden bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/30 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-primary uppercase tracking-wide">
                        Balanço Serviços
                      </span>
                      {isAdmin && barberName && (
                        <span className="text-xs text-muted-foreground">
                          {barberName}
                        </span>
                      )}
                    </div>
                    <div className="text-4xl font-bold text-foreground">
                      {formatCurrency(stats.totalRevenue)}
                    </div>
                    <div className="text-muted-foreground">
                      {stats.totalAppointments} atendimentos
                    </div>
                  </div>

                  {/* Desktop Revenue Summary */}
                  <div className="hidden lg:block bg-muted rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-black" />
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground uppercase tracking-wide block">
                            Balanço Serviços
                          </span>
                          {isAdmin && barberName && (
                            <span className="text-xs text-primary">
                              {barberName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-foreground">
                          {formatCurrency(stats.totalRevenue)}
                        </div>
                        <div className="text-muted-foreground">
                          {stats.totalAppointments} atendimentos
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Revenue Chart */}
                  <div className="bg-muted rounded-xl border border-border p-6">
                    <RevenueChart dailyRevenue={stats.dailyRevenue} />
                  </div>

                  {/* Filter and PDF buttons - Mobile */}
                  <div className="lg:hidden flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground uppercase">
                        Filtro:
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-border text-muted-foreground"
                        disabled
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Data
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePdf}
                      disabled={isGeneratingPdf}
                      className="text-xs border-border text-muted-foreground hover:bg-accent"
                    >
                      {isGeneratingPdf ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3 mr-1" />
                      )}
                      Gerar PDF
                    </Button>
                  </div>

                  {/* Service Breakdown */}
                  <ServiceBreakdown services={stats.serviceBreakdown} />

                  {/* Metric Cards */}
                  <MetricCards
                    ticketMedio={stats.ticketMedio}
                    occupancyRate={stats.occupancyRate}
                  />

                  {/* Detailed Metrics */}
                  <DetailedMetrics
                    uniqueClients={stats.uniqueClients}
                    availableHours={stats.availableHours}
                    workedHours={stats.workedHours}
                    idleHours={stats.idleHours}
                    closedHours={stats.closedHours}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
