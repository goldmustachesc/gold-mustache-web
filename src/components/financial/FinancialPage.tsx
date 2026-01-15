"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
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
import { generateFinancialPDF } from "@/lib/pdf/financial-report";
import type { FinancialStats } from "@/types/financial";
import Link from "next/link";

interface FinancialPageProps {
  locale: string;
  isAdmin?: boolean;
  onBack?: () => void;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function FinancialPage({
  locale,
  isAdmin = false,
  onBack,
}: FinancialPageProps) {
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

  const handleMonthSelect = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleGeneratePdf = async () => {
    if (!stats) return;

    setIsGeneratingPdf(true);
    try {
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
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              ) : (
                <Link
                  href={`/${locale}/${isAdmin ? "dashboard" : "barbeiro"}`}
                  className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              )}
              <Image
                src="/logo.png"
                alt="Gold Mustache"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                  Faturamento
                </h1>
                <p className="text-sm text-zinc-400">
                  {isAdmin
                    ? barberName || "Todos os Barbeiros"
                    : "Relatório Financeiro"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf || !stats}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Gerar PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block lg:w-3/12 space-y-4">
              {/* Revenue Summary Card */}
              {stats && (
                <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/10 rounded-xl border border-amber-500/30 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                    <span className="text-sm text-amber-400 font-medium">
                      Receita Total
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {stats.totalAppointments} atendimentos
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {stats && (
                <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    Resumo do Período
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">
                        Ticket Médio
                      </span>
                      <span className="font-semibold text-amber-400">
                        {formatCurrency(stats.ticketMedio)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Ocupação</span>
                      <span className="font-semibold text-white">
                        {stats.occupancyRate}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Clientes</span>
                      <span className="font-semibold text-white">
                        {stats.uniqueClients}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">
                        Horas Trabalhadas
                      </span>
                      <span className="font-semibold text-white">
                        {stats.workedHours}h
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <h3 className="font-semibold text-white mb-3 text-sm">
                  Outras Configurações
                </h3>
                <div className="space-y-2">
                  {isAdmin ? (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/admin/barbeiros`}>
                          <Users className="h-4 w-4 mr-2" />
                          Barbeiros
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/admin/barbearia/servicos`}>
                          <Scissors className="h-4 w-4 mr-2" />
                          Serviços
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/admin/barbearia/horarios`}>
                          <Clock className="h-4 w-4 mr-2" />
                          Horários
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
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
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Minha Agenda
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/horarios`}>
                          <Clock className="h-4 w-4 mr-2" />
                          Meus Horários
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
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
              <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/5 rounded-xl border border-amber-500/20 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-400 text-sm mb-1">
                      Relatório PDF
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
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
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <MonthSelector
                  months={months}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onSelect={handleMonthSelect}
                />
              </div>

              {/* Admin: Barber Selector */}
              {isAdmin && barbers.length > 0 && (
                <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                  <span className="text-sm text-zinc-400 mb-2 block">
                    Filtrar por Barbeiro
                  </span>
                  <Select
                    value={selectedBarberId || "all"}
                    onValueChange={(value) =>
                      setSelectedBarberId(value === "all" ? undefined : value)
                    }
                  >
                    <SelectTrigger className="w-full max-w-xs bg-zinc-900/50 border-zinc-700/50 text-white focus:border-amber-500/50 focus:ring-amber-500/20">
                      <SelectValue placeholder="Selecione o barbeiro" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem
                        value="all"
                        className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                      >
                        Todos os Barbeiros
                      </SelectItem>
                      {barbers.map((barber) => (
                        <SelectItem
                          key={barber.id}
                          value={barber.id}
                          className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
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
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              ) : error ? (
                <div className="bg-zinc-800/30 rounded-xl border border-red-500/30 p-8 text-center">
                  <p className="text-red-400 font-medium">
                    Erro ao carregar dados
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    Tente novamente mais tarde
                  </p>
                </div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Mobile Revenue Summary */}
                  <div className="lg:hidden bg-gradient-to-br from-amber-500/20 to-yellow-600/10 rounded-xl border border-amber-500/30 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-amber-400 uppercase tracking-wide">
                        Balanço Serviços
                      </span>
                      {isAdmin && barberName && (
                        <span className="text-xs text-zinc-400">
                          {barberName}
                        </span>
                      )}
                    </div>
                    <div className="text-4xl font-bold text-white">
                      {formatCurrency(stats.totalRevenue)}
                    </div>
                    <div className="text-zinc-400">
                      {stats.totalAppointments} atendimentos
                    </div>
                  </div>

                  {/* Desktop Revenue Summary */}
                  <div className="hidden lg:block bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-black" />
                        </div>
                        <div>
                          <span className="text-sm text-zinc-400 uppercase tracking-wide block">
                            Balanço Serviços
                          </span>
                          {isAdmin && barberName && (
                            <span className="text-xs text-amber-400">
                              {barberName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-white">
                          {formatCurrency(stats.totalRevenue)}
                        </div>
                        <div className="text-zinc-400">
                          {stats.totalAppointments} atendimentos
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Revenue Chart */}
                  <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-6">
                    <RevenueChart dailyRevenue={stats.dailyRevenue} />
                  </div>

                  {/* Filter and PDF buttons - Mobile */}
                  <div className="lg:hidden flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 uppercase">
                        Filtro:
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-zinc-700 text-zinc-400"
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
                      className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
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
