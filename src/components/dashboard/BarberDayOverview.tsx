"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BarberStats } from "@/types/dashboard";
import {
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface BarberDayOverviewProps {
  stats: BarberStats;
  locale: string;
}

export function BarberDayOverview({ stats, locale }: BarberDayOverviewProps) {
  return (
    <div className="space-y-4">
      {/* Next Client Card */}
      {stats.nextClient && (
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Próximo Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">
                  {stats.nextClient.clientName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.nextClient.serviceName} • {stats.nextClient.duration}{" "}
                  min
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {stats.nextClient.time}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Resumo de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Atendimentos</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.completedToday}
                <span className="text-sm text-muted-foreground font-normal">
                  /{stats.todayAppointments}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.pendingToday} pendente{stats.pendingToday !== 1 && "s"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Receita</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                R$ {stats.todayEarnings.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground">estimado hoje</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Esta Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Atendimentos</p>
              <p className="text-xl font-bold">{stats.weekAppointments}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Receita</p>
              <p className="text-xl font-bold text-emerald-600">
                R$ {stats.weekEarnings.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action */}
      <Button asChild className="w-full">
        <Link href={`/${locale}/barbeiro`}>
          Ver agenda completa
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    </div>
  );
}
