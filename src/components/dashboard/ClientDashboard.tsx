"use client";

import { Button } from "@/components/ui/button";
import { useProfileMe } from "@/hooks/useProfileMe";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import {
  usePrivateHeader,
  PrivateHeaderActions,
} from "@/components/private/PrivateHeaderContext";
import { getGreeting } from "@/lib/dashboard/greeting";
import { NextAppointmentCard } from "./NextAppointmentCard";
import { AdminOverview } from "./AdminOverview";
import { ClientStatsOverview } from "./ClientStatsOverview";
import { QuickAction } from "./QuickAction";
import {
  Calendar,
  ClipboardList,
  Clock,
  DollarSign,
  Home,
  Loader2,
  Scissors,
  Settings,
  Star,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";

interface ClientDashboardProps {
  locale: string;
}

export function ClientDashboard({ locale }: ClientDashboardProps) {
  const { data: profileMe } = useProfileMe();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { bookingHref, shouldShowBooking, isExternal, isInternal } =
    useBookingSettings();

  const isAdmin = profileMe?.role === "ADMIN";
  const firstName = profileMe?.fullName?.split(" ")[0] || "";

  usePrivateHeader({
    title: "Início",
    icon: Home,
  });

  return (
    <div>
      <PrivateHeaderActions>
        {shouldShowBooking && bookingHref ? (
          <Link
            href={bookingHref}
            className="hidden sm:block"
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold">
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </Button>
          </Link>
        ) : null}
      </PrivateHeaderActions>
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Confira seus agendamentos e novidades.
          </p>
        </div>

        {statsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              Carregando informações...
            </span>
          </div>
        )}

        {isInternal && !statsLoading && stats?.client?.nextAppointment && (
          <section>
            <NextAppointmentCard
              appointment={stats.client.nextAppointment}
              locale={locale}
            />
          </section>
        )}

        {isInternal &&
          !statsLoading &&
          stats?.client &&
          stats.client.totalVisits > 0 && (
            <section>
              <ClientStatsOverview stats={stats.client} locale={locale} />
            </section>
          )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Acesso rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shouldShowBooking && bookingHref && (
              <QuickAction
                href={bookingHref}
                icon={<Calendar className="h-5 w-5" />}
                label="Agendar"
                description="Marque um novo horário"
                variant="primary"
                linkTarget={isExternal ? "_blank" : undefined}
                linkRel={isExternal ? "noopener noreferrer" : undefined}
              />
            )}
            {isInternal && (
              <QuickAction
                href={`/${locale}/meus-agendamentos`}
                icon={<ClipboardList className="h-5 w-5 text-emerald-400" />}
                label="Meus Agendamentos"
                description="Ver e gerenciar"
              />
            )}
            <QuickAction
              href={`/${locale}/profile`}
              icon={<User className="h-5 w-5 text-blue-400" />}
              label="Meu Perfil"
              description="Editar dados pessoais"
            />
          </div>
        </div>

        {!statsLoading && isAdmin && stats?.admin && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Visão Geral da Barbearia
            </h2>
            <AdminOverview stats={stats.admin} />
          </section>
        )}

        {isAdmin && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
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
              <QuickAction
                href={`/${locale}/admin/feedbacks`}
                icon={<Star className="h-5 w-5 text-yellow-400" />}
                label="Avaliações"
                description="Feedback dos clientes"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
