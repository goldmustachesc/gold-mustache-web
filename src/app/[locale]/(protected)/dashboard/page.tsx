"use client";

import { useState } from "react";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { useProfileMe } from "@/hooks/useProfileMe";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  NextAppointmentCard,
  AdminOverview,
  ClientStatsOverview,
  ClientSidebar,
} from "@/components/dashboard";
import { BarberDashboard } from "@/components/dashboard/BarberDashboard";
import { NotificationPanel } from "@/components/notifications";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  Loader2,
  Menu,
  Scissors,
  Settings,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const { data: profileMe } = useProfileMe();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const params = useParams();
  const locale = params.locale as string;

  const isBarber = !!barberProfile;
  const isAdmin = profileMe?.role === "ADMIN";
  const isLoading = userLoading || statsLoading;

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = profileMe?.fullName?.split(" ")[0] || "";

  // Show loading while checking user and barber status
  if (userLoading || barberLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // If user is a barber, show the new BarberDashboard
  if (isBarber) {
    return <BarberDashboard locale={locale} />;
  }

  // Otherwise, show the client/admin dashboard with new design
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Sidebar */}
      <ClientSidebar
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
            <Link href={`/${locale}/agendar`} className="hidden sm:block">
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold">
                <Calendar className="h-4 w-4 mr-2" />
                Agendar
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
            {getGreeting()}
            {firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="text-zinc-400">
            Bem-vindo de volta! Confira seus agendamentos e novidades.
          </p>
        </div>

        {/* Loading Stats */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span className="ml-2 text-zinc-400">
              Carregando informações...
            </span>
          </div>
        )}

        {/* Client Section - Next Appointment */}
        {!isLoading && stats?.client?.nextAppointment && (
          <section>
            <NextAppointmentCard
              appointment={stats.client.nextAppointment}
              locale={locale}
            />
          </section>
        )}

        {/* Client Stats Section */}
        {!isLoading && stats?.client && stats.client.totalVisits > 0 && (
          <section>
            <ClientStatsOverview stats={stats.client} locale={locale} />
          </section>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">Acesso rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickAction
              href={`/${locale}/agendar`}
              icon={<Calendar className="h-5 w-5" />}
              label="Agendar"
              description="Marque um novo horário"
              variant="primary"
            />
            <QuickAction
              href={`/${locale}/meus-agendamentos`}
              icon={<ClipboardList className="h-5 w-5 text-emerald-400" />}
              label="Meus Agendamentos"
              description="Ver e gerenciar"
            />
            <QuickAction
              href={`/${locale}/profile`}
              icon={<User className="h-5 w-5 text-blue-400" />}
              label="Meu Perfil"
              description="Editar dados pessoais"
            />
          </div>
        </div>

        {/* Admin Section - Shop Overview */}
        {!isLoading && isAdmin && stats?.admin && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-400" />
              Visão Geral da Barbearia
            </h2>
            <AdminOverview stats={stats.admin} />
          </section>
        )}

        {/* Admin Quick Actions */}
        {isAdmin && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-200">
              Administração
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickAction
                href={`/${locale}/admin/barbearia/horarios`}
                icon={<Clock className="h-5 w-5 text-orange-400" />}
                label="Horários da Barbearia"
                description="Configurar horário global"
              />
              <QuickAction
                href={`/${locale}/admin/barbearia/servicos`}
                icon={<Scissors className="h-5 w-5 text-purple-400" />}
                label="Serviços"
                description="Gerenciar serviços"
              />
              <QuickAction
                href={`/${locale}/admin/barbeiros`}
                icon={<Users className="h-5 w-5 text-cyan-400" />}
                label="Barbeiros"
                description="Gerenciar equipe"
              />
              <QuickAction
                href={`/${locale}/admin/faturamento`}
                icon={<DollarSign className="h-5 w-5 text-green-400" />}
                label="Faturamento"
                description="Relatório financeiro"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
