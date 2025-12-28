"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function AdminOverview({ stats }: AdminOverviewProps) {
  return (
    <div className="space-y-4">
      {/* Today Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Agendamentos</span>
              </div>
              <p className="text-2xl font-bold">{stats.todayAppointments}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Receita</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                R$ {stats.todayRevenue.toFixed(2).replace(".", ",")}
              </p>
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
              <p className="text-sm text-muted-foreground">Agendamentos</p>
              <p className="text-xl font-bold">{stats.weekAppointments}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Receita</p>
              <p className="text-xl font-bold text-emerald-600">
                R$ {stats.weekRevenue.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team & Clients */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Equipe & Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Scissors className="h-4 w-4" />
                <span>Barbeiros Ativos</span>
              </div>
              <p className="text-2xl font-bold">{stats.activeBarbers}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Clientes</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalClients}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
