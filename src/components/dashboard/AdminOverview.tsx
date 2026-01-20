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
      {/* Today & Week Stats - Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Today Appointments */}
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20">
          <div className="relative z-10">
            <p className="text-sm font-medium text-white/90">Hoje</p>
            <p className="mt-1 text-3xl font-bold text-white">
              {stats.todayAppointments}
            </p>
            <p className="text-xs text-white/70">agendamentos</p>
          </div>
          <Calendar className="absolute -right-2 -bottom-2 h-16 w-16 text-white/10" />
        </div>

        {/* Today Revenue */}
        <div className="relative overflow-hidden rounded-2xl p-4 bg-zinc-800/50 border border-zinc-700/50">
          <div className="relative z-10">
            <p className="text-sm font-medium text-zinc-400">Receita Hoje</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">
              {formatCurrency(stats.todayRevenue)}
            </p>
          </div>
          <DollarSign className="absolute -right-2 -bottom-2 h-16 w-16 text-emerald-500/10" />
        </div>

        {/* Week Appointments */}
        <div className="relative overflow-hidden rounded-2xl p-4 bg-zinc-800/50 border border-zinc-700/50">
          <div className="relative z-10">
            <p className="text-sm font-medium text-zinc-400">Esta Semana</p>
            <p className="mt-1 text-3xl font-bold text-zinc-100">
              {stats.weekAppointments}
            </p>
            <p className="text-xs text-zinc-500">agendamentos</p>
          </div>
          <TrendingUp className="absolute -right-2 -bottom-2 h-16 w-16 text-zinc-600/30" />
        </div>

        {/* Week Revenue */}
        <div className="relative overflow-hidden rounded-2xl p-4 bg-zinc-800/50 border border-zinc-700/50">
          <div className="relative z-10">
            <p className="text-sm font-medium text-zinc-400">Receita Semana</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">
              {formatCurrency(stats.weekRevenue)}
            </p>
          </div>
          <DollarSign className="absolute -right-2 -bottom-2 h-16 w-16 text-emerald-500/10" />
        </div>
      </div>

      {/* Team & Clients */}
      <div className="rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-zinc-200">Equipe & Clientes</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Scissors className="h-4 w-4 text-zinc-500" />
              <span>Barbeiros Ativos</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {stats.activeBarbers}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Users className="h-4 w-4 text-zinc-500" />
              <span>Clientes</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">
              {stats.totalClients}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
