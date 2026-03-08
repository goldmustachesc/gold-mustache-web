"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarberStatsCards } from "./BarberStatsCards";
import { QuickAction } from "./QuickAction";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  usePrivateHeader,
  PrivateHeaderActions,
} from "@/components/private/PrivateHeaderContext";
import {
  Calendar,
  CalendarOff,
  Clock,
  DollarSign,
  Link2,
  Loader2,
  Scissors,
  Star,
  User,
  UserPlus,
  Users,
  XCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface BarberHubProps {
  locale: string;
}

function NextClientCard({
  time,
  clientName,
  serviceName,
  duration,
}: {
  time: string;
  clientName: string;
  serviceName: string;
  duration: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/20 to-success/10 border border-success/30 p-5">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium text-success">
            Próximo cliente
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-primary-foreground">{time}</p>
          <p className="text-lg font-semibold text-foreground">{clientName}</p>
          <p className="text-sm text-muted-foreground">
            {serviceName} • {duration} min
          </p>
        </div>
      </div>
      <Sparkles className="absolute -right-4 -bottom-4 h-24 w-24 text-success/10" />
    </div>
  );
}

function EmptyNextClient() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card/30 border border-border p-5">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
          <Calendar className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Nenhum cliente hoje</p>
          <p className="text-sm text-muted-foreground">
            Sua agenda está livre por enquanto
          </p>
        </div>
      </div>
    </div>
  );
}

export function BarberHub({ locale }: BarberHubProps) {
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const isLoading = barberLoading || statsLoading;
  const barberStats = stats?.barber;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const bookingUrl = barberProfile
    ? `${baseUrl}/${locale}/agendar?barbeiro=${barberProfile.id}`
    : "";

  usePrivateHeader({
    title: "Início",
    icon: Scissors,
  });

  if (isLoading || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PrivateHeaderActions>
        <Link href={`/${locale}/barbeiro/agendar`} className="hidden sm:block">
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold">
            <UserPlus className="h-4 w-4 mr-2" />
            Agendar para Cliente
          </Button>
        </Link>
      </PrivateHeaderActions>
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold">
            {getGreeting()}, {barberProfile.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Aqui está o resumo do seu dia na barbearia.
          </p>
        </div>

        {/* Stats + Next Client Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stats Cards */}
          <BarberStatsCards
            todayCount={barberStats?.todayAppointments ?? 0}
            todayRevenue={barberStats?.todayEarnings ?? 0}
            weekCount={barberStats?.weekAppointments ?? 0}
            weekRevenue={barberStats?.weekEarnings ?? 0}
          />

          {/* Next Client */}
          {barberStats?.nextClient ? (
            <NextClientCard
              time={barberStats.nextClient.time}
              clientName={barberStats.nextClient.clientName}
              serviceName={barberStats.nextClient.serviceName}
              duration={barberStats.nextClient.duration}
            />
          ) : (
            <EmptyNextClient />
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Acesso rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickAction
              href={`/${locale}/dashboard`}
              icon={<Scissors className="h-5 w-5" />}
              label="Minha Agenda"
              description="Ver todos os agendamentos"
              variant="primary"
            />
            <QuickAction
              href={`/${locale}/barbeiro/agendar`}
              icon={<UserPlus className="h-5 w-5 text-primary" />}
              label="Agendar para Cliente"
              description="Criar novo agendamento"
            />
            <QuickAction
              href={`/${locale}/barbeiro/meu-link`}
              icon={<Link2 className="h-5 w-5 text-blue-400" />}
              label="Meu Link"
              description="Compartilhar com clientes"
            />
            <QuickAction
              href={`/${locale}/barbeiro/clientes`}
              icon={<Users className="h-5 w-5 text-purple-400" />}
              label="Clientes"
              description="Lista de clientes"
            />
            <QuickAction
              href={`/${locale}/barbeiro/horarios`}
              icon={<Clock className="h-5 w-5 text-success" />}
              label="Meus Horários"
              description="Configurar disponibilidade"
            />
            <QuickAction
              href={`/${locale}/barbeiro/ausencias`}
              icon={<CalendarOff className="h-5 w-5 text-orange-400" />}
              label="Ausências"
              description="Folgas e indisponibilidades"
            />
            <QuickAction
              href={`/${locale}/barbeiro/cancelados`}
              icon={<XCircle className="h-5 w-5 text-red-400" />}
              label="Cancelados"
              description="Histórico de cancelamentos"
            />
            <QuickAction
              href={`/${locale}/barbeiro/faturamento`}
              icon={<DollarSign className="h-5 w-5 text-green-400" />}
              label="Faturamento"
              description="Relatório financeiro"
            />
            <QuickAction
              href={`/${locale}/barbeiro/feedbacks`}
              icon={<Star className="h-5 w-5 text-yellow-400" />}
              label="Minhas Avaliações"
              description="Feedback dos clientes"
            />
            <QuickAction
              href={`/${locale}/profile`}
              icon={<User className="h-5 w-5 text-blue-400" />}
              label="Meu Perfil"
              description="Editar dados pessoais"
            />
          </div>
        </div>

        {/* Quick Share Link */}
        {bookingUrl && (
          <div className="rounded-xl bg-card/30 border border-border p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Seu link de agendamento
                  </p>
                  <p className="text-sm text-muted-foreground truncate max-w-xs">
                    {bookingUrl}
                  </p>
                </div>
              </div>
              <Link href={`/${locale}/barbeiro/meu-link`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-accent text-foreground"
                >
                  Compartilhar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
