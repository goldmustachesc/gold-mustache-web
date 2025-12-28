"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ClientStats } from "@/types/dashboard";
import {
  Calendar,
  Heart,
  Scissors,
  Star,
  TrendingUp,
  RefreshCw,
  ArrowRight,
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
      {/* Visit History */}
      {hasHistory && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Seu Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Visitas</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalVisits}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span>Total Gasto</span>
                </div>
                <p className="text-2xl font-bold">
                  R$ {stats.totalSpent.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favorites */}
      {(stats.favoriteBarber || stats.favoriteService) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Seus Favoritos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.favoriteBarber && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Barbeiro favorito</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{stats.favoriteBarber.name}</p>
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
                  <span className="text-sm">Serviço favorito</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{stats.favoriteService.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.favoriteService.useCount} vezes
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Rebook */}
      {stats.lastService && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Repetir último serviço?</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.lastService.serviceName} com{" "}
                    {stats.lastService.barberName}
                  </p>
                </div>
              </div>
              <Button asChild size="sm">
                <Link
                  href={`/${locale}/agendar?barberId=${stats.lastService.barberId}&serviceId=${stats.lastService.serviceId}`}
                >
                  Agendar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View History */}
      {hasHistory && (
        <Button asChild variant="outline" className="w-full">
          <Link href={`/${locale}/meus-agendamentos`}>
            Ver todos os agendamentos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      )}
    </div>
  );
}
