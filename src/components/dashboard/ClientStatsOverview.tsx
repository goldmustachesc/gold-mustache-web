"use client";

import { Button } from "@/components/ui/button";
import type { ClientStats } from "@/types/dashboard";
import {
  Calendar,
  Heart,
  Scissors,
  Star,
  RefreshCw,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

interface ClientStatsOverviewProps {
  stats: ClientStats;
  locale: string;
}

export function ClientStatsOverview({
  stats,
  locale,
}: ClientStatsOverviewProps) {
  const hasHistory = stats.totalVisits > 0;

  return (
    <div className="space-y-4">
      {/* Visit History - Stats Cards */}
      {hasHistory && (
        <div className="grid grid-cols-2 gap-3">
          {/* Total Visits Card */}
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20">
            <div className="relative z-10">
              <p className="text-sm font-medium text-white/90">Total Visitas</p>
              <p className="mt-2 text-4xl font-bold text-white">
                {stats.totalVisits}
              </p>
            </div>
            <Calendar className="absolute -right-2 -bottom-2 h-20 w-20 text-white/10" />
          </div>

          {/* Total Spent Card */}
          <div className="relative overflow-hidden rounded-2xl p-4 bg-zinc-800/50 border border-zinc-700/50">
            <div className="relative z-10">
              <p className="text-sm font-medium text-zinc-400">Total Gasto</p>
              <p className="mt-2 text-2xl font-bold text-zinc-100">
                R$ {stats.totalSpent.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <DollarSign className="absolute -right-2 -bottom-2 h-20 w-20 text-zinc-600/30" />
          </div>
        </div>
      )}

      {/* Favorites */}
      {(stats.favoriteBarber || stats.favoriteService) && (
        <div className="rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-pink-400" />
            <h3 className="font-semibold text-zinc-200">Seus Favoritos</h3>
          </div>
          <div className="space-y-3">
            {stats.favoriteBarber && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">
                    Barbeiro favorito
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-zinc-200">
                    {stats.favoriteBarber.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {stats.favoriteBarber.visitCount} visitas
                  </p>
                </div>
              </div>
            )}
            {stats.favoriteService && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">
                    Serviço favorito
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-zinc-200">
                    {stats.favoriteService.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {stats.favoriteService.useCount} vezes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Rebook */}
      {stats.lastService && (
        <div className="rounded-2xl bg-zinc-800/30 border border-dashed border-zinc-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm text-zinc-200">
                  Repetir último serviço?
                </p>
                <p className="text-xs text-zinc-500">
                  {stats.lastService.serviceName} com{" "}
                  {stats.lastService.barberName}
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
            >
              <Link
                href={`/${locale}/agendar?barbeiro=${stats.lastService.barberId}`}
              >
                Agendar
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* View History */}
      {hasHistory && (
        <Button
          asChild
          variant="outline"
          className="w-full border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-100"
        >
          <Link href={`/${locale}/meus-agendamentos`}>
            Ver todos os agendamentos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      )}
    </div>
  );
}
