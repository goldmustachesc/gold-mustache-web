"use client";

import { Button } from "@/components/ui/button";
import { useBookingSettings } from "@/hooks/useBookingSettings";
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
  const { isInternal } = useBookingSettings();

  return (
    <div className="space-y-4">
      {hasHistory && (
        <div className="grid grid-cols-2 gap-3">
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <div className="relative z-10">
              <p className="text-sm font-medium text-primary-foreground/90">
                Total Visitas
              </p>
              <p className="mt-2 text-4xl font-bold text-primary-foreground">
                {stats.totalVisits}
              </p>
            </div>
            <Calendar className="absolute -right-2 -bottom-2 h-20 w-20 text-primary-foreground/10" />
          </div>

          <div className="relative overflow-hidden rounded-2xl p-4 bg-card/50 border border-border">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground">
                Total Gasto
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                R$ {stats.totalSpent.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <DollarSign className="absolute -right-2 -bottom-2 h-20 w-20 text-muted/30" />
          </div>
        </div>
      )}

      {(stats.favoriteBarber || stats.favoriteService) && (
        <div className="rounded-2xl bg-card/30 border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-pink-400" />
            <h3 className="font-semibold text-foreground">Seus Favoritos</h3>
          </div>
          <div className="space-y-3">
            {stats.favoriteBarber && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Barbeiro favorito
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    {stats.favoriteBarber.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.favoriteBarber.visitCount} visitas
                  </p>
                </div>
              </div>
            )}
            {stats.favoriteService && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Serviço favorito
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    {stats.favoriteService.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.favoriteService.useCount} vezes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isInternal && stats.lastService && (
        <div className="rounded-2xl bg-card/30 border border-dashed border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">
                  Repetir último serviço?
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.lastService.serviceName} com{" "}
                  {stats.lastService.barberName}
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
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

      {isInternal && hasHistory && (
        <Button
          asChild
          variant="outline"
          className="w-full border-border bg-card/50 hover:bg-card text-foreground"
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
