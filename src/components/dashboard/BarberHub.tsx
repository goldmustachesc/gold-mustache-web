"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { BarberSidebar } from "./BarberSidebar";
import { BarberStatsCards } from "./BarberStatsCards";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { useUser } from "@/hooks/useAuth";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarOff,
  Clock,
  DollarSign,
  Link2,
  Loader2,
  Menu,
  Scissors,
  UserPlus,
  Users,
  XCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface BarberHubProps {
  locale: string;
}

interface QuickActionProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  variant?: "default" | "primary";
}

function QuickAction({
  href,
  icon,
  label,
  description,
  variant = "default",
}: QuickActionProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl p-4 transition-all duration-200",
          "hover:scale-[1.02] hover:shadow-lg",
          variant === "primary"
            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/20"
            : "bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-100",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              variant === "primary"
                ? "bg-white/20"
                : "bg-zinc-700/50 group-hover:bg-zinc-700",
            )}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{label}</p>
            {description && (
              <p
                className={cn(
                  "text-xs truncate",
                  variant === "primary" ? "text-white/80" : "text-zinc-400",
                )}
              >
                {description}
              </p>
            )}
          </div>
          <ChevronRight
            className={cn(
              "h-5 w-5 transition-transform group-hover:translate-x-1",
              variant === "primary" ? "text-white/60" : "text-zinc-500",
            )}
          />
        </div>
      </div>
    </Link>
  );
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 p-5">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-emerald-400">
            Próximo cliente
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white">{time}</p>
          <p className="text-lg font-semibold text-zinc-200">{clientName}</p>
          <p className="text-sm text-zinc-400">
            {serviceName} • {duration} min
          </p>
        </div>
      </div>
      <Sparkles className="absolute -right-4 -bottom-4 h-24 w-24 text-emerald-500/10" />
    </div>
  );
}

function EmptyNextClient() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-5">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-zinc-700/50 flex items-center justify-center">
          <Calendar className="h-6 w-6 text-zinc-500" />
        </div>
        <div>
          <p className="font-semibold text-zinc-300">Nenhum cliente hoje</p>
          <p className="text-sm text-zinc-500">
            Sua agenda está livre por enquanto
          </p>
        </div>
      </div>
    </div>
  );
}

export function BarberHub({ locale }: BarberHubProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const isLoading = barberLoading || statsLoading;
  const barberStats = stats?.barber;

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Build the booking URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const bookingUrl = barberProfile
    ? `${baseUrl}/${locale}/agendar?barbeiro=${barberProfile.id}`
    : "";

  if (isLoading || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Sidebar */}
      <BarberSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        locale={locale}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4 lg:px-8">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Gold Mustache"
              width={40}
              height={40}
              className="rounded-full"
            />
            <BrandWordmark className="hidden sm:inline text-xl">
              GOLD MUSTACHE
            </BrandWordmark>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            <Link
              href={`/${locale}/barbeiro/agendar`}
              className="hidden sm:block"
            >
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold">
                <UserPlus className="h-4 w-4 mr-2" />
                Agendar para Cliente
              </Button>
            </Link>

            {user?.email && (
              <span className="text-sm text-zinc-400 hidden xl:inline">
                {user.email}
              </span>
            )}

            {user?.id && <NotificationPanel userId={user.id} />}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-6">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold">
            {getGreeting()}, {barberProfile.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-zinc-400">
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
          <h2 className="text-lg font-semibold text-zinc-200">Acesso rápido</h2>
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
              icon={<UserPlus className="h-5 w-5 text-amber-400" />}
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
              icon={<Clock className="h-5 w-5 text-emerald-400" />}
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
          </div>
        </div>

        {/* Quick Share Link */}
        {bookingUrl && (
          <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-200">
                    Seu link de agendamento
                  </p>
                  <p className="text-sm text-zinc-500 truncate max-w-xs">
                    {bookingUrl}
                  </p>
                </div>
              </div>
              <Link href={`/${locale}/barbeiro/meu-link`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
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
