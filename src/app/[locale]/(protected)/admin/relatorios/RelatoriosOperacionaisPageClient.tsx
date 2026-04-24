"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, Loader2, UserX, Wallet } from "lucide-react";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLastMonths } from "@/hooks/useFinancialStats";
import { useAdminOperationalReports } from "@/hooks/useAdminOperationalReports";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function RelatoriosOperacionaisPageClient() {
  usePrivateHeader({
    title: "Relatórios Operacionais",
    icon: BarChart3,
  });

  const months = getLastMonths(6);
  const currentMonth = months[months.length - 1];
  const [selectedMonth, setSelectedMonth] = useState<number>(
    currentMonth.month,
  );
  const [selectedYear, setSelectedYear] = useState<number>(currentMonth.year);

  const { data, isLoading, isError, isFetching } = useAdminOperationalReports(
    selectedMonth,
    selectedYear,
  );

  return (
    <main className="container mx-auto max-w-7xl space-y-4 px-4 py-6 lg:py-8">
      <section className="rounded-xl border border-border bg-card/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <Select
            value={`${selectedMonth}-${selectedYear}`}
            onValueChange={(value) => {
              const [month, year] = value.split("-").map(Number);
              setSelectedMonth(month);
              setSelectedYear(year);
            }}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem
                  key={`${month.month}-${month.year}`}
                  value={`${month.month}-${month.year}`}
                >
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" disabled={isFetching}>
            {isFetching ? "Atualizando..." : "Atualizado"}
          </Button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando relatórios...
        </div>
      ) : isError || !data ? (
        <div className="py-8 text-center text-sm text-destructive">
          Erro ao carregar relatórios operacionais.
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              testId="ops-no-show-total"
              icon={<AlertTriangle className="h-4 w-4 text-primary" />}
              label="No-shows"
              value={data.noShow.totalNoShows}
            />
            <KpiCard
              testId="ops-no-show-lost-revenue"
              icon={<Wallet className="h-4 w-4 text-primary" />}
              label="Receita perdida"
              value={formatCurrency(data.noShow.totalLostRevenue)}
            />
            <KpiCard
              testId="ops-retention-30"
              icon={<UserX className="h-4 w-4 text-primary" />}
              label="Inativos 30d (cad.)"
              value={data.retention.registeredClients.inactive30Days}
            />
            <KpiCard
              testId="ops-retention-90"
              icon={<UserX className="h-4 w-4 text-primary" />}
              label="Inativos 90d (cad.)"
              value={data.retention.registeredClients.inactive90Days}
            />
          </section>

          <p className="text-xs text-muted-foreground">
            Período de no-show: {data.period.startDate} a {data.period.endDate}.
            Referência de retenção: {data.retention.asOf}.
          </p>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <h2 className="mb-3 text-lg font-semibold">No-show por barbeiro</h2>
            {data.noShow.byBarber.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum no-show no período selecionado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barbeiro</TableHead>
                    <TableHead>No-shows</TableHead>
                    <TableHead>Receita perdida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.noShow.byBarber.map((row) => (
                    <TableRow key={row.barberId}>
                      <TableCell>{row.barberName}</TableCell>
                      <TableCell>{row.noShowCount}</TableCell>
                      <TableCell>{formatCurrency(row.lostRevenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Retenção - Cadastrados
              </h3>
              <p className="text-sm">
                Inativos 30 dias:{" "}
                {data.retention.registeredClients.inactive30Days}
              </p>
              <p className="text-sm">
                Inativos 60 dias:{" "}
                {data.retention.registeredClients.inactive60Days}
              </p>
              <p className="text-sm">
                Inativos 90 dias:{" "}
                {data.retention.registeredClients.inactive90Days}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Retenção - Convidados
              </h3>
              <p className="text-sm">
                Inativos 30 dias: {data.retention.guestClients.inactive30Days}
              </p>
              <p className="text-sm">
                Inativos 60 dias: {data.retention.guestClients.inactive60Days}
              </p>
              <p className="text-sm">
                Inativos 90 dias: {data.retention.guestClients.inactive90Days}
              </p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
