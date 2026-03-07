"use client";

import type { AdminStats } from "@/types/dashboard";
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Scissors,
} from "lucide-react";

interface AdminOverviewProps {
  stats: AdminStats;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function AdminOverview({ stats }: AdminOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
          <div className="relative z-10">
            <p className="text-sm font-medium text-primary-foreground/90">
              Hoje
            </p>
            <p className="mt-1 text-3xl font-bold text-primary-foreground">
              {stats.todayAppointments}
            </p>
            <p className="text-xs text-primary-foreground/70">agendamentos</p>
          </div>
          <Calendar className="absolute -right-2 -bottom-2 h-16 w-16 text-primary-foreground/10" />
        </div>

        <div className="relative overflow-hidden rounded-2xl p-4 bg-card/50 border border-border">
          <div className="relative z-10">
            <p className="text-sm font-medium text-muted-foreground">
              Receita Hoje
            </p>
            <p className="mt-1 text-xl font-bold text-success">
              {formatCurrency(stats.todayRevenue)}
            </p>
          </div>
          <DollarSign className="absolute -right-2 -bottom-2 h-16 w-16 text-success/10" />
        </div>

        <div className="relative overflow-hidden rounded-2xl p-4 bg-card/50 border border-border">
          <div className="relative z-10">
            <p className="text-sm font-medium text-muted-foreground">
              Esta Semana
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {stats.weekAppointments}
            </p>
            <p className="text-xs text-muted-foreground">agendamentos</p>
          </div>
          <TrendingUp className="absolute -right-2 -bottom-2 h-16 w-16 text-muted/30" />
        </div>

        <div className="relative overflow-hidden rounded-2xl p-4 bg-card/50 border border-border">
          <div className="relative z-10">
            <p className="text-sm font-medium text-muted-foreground">
              Receita Semana
            </p>
            <p className="mt-1 text-xl font-bold text-success">
              {formatCurrency(stats.weekRevenue)}
            </p>
          </div>
          <DollarSign className="absolute -right-2 -bottom-2 h-16 w-16 text-success/10" />
        </div>
      </div>

      <div className="rounded-2xl bg-card/30 border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-foreground">Equipe & Clientes</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <span>Barbeiros Ativos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.activeBarbers}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Clientes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalClients}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
