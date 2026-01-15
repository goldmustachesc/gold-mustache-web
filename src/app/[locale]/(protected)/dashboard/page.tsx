"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSignOut, useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { useProfileMe } from "@/hooks/useProfileMe";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  NextAppointmentCard,
  AdminOverview,
  ClientStatsOverview,
} from "@/components/dashboard";
import { BarberDashboard } from "@/components/dashboard/BarberDashboard";
import { NotificationPanel } from "@/components/notifications";
import {
  Calendar,
  ClipboardList,
  Scissors,
  Settings,
  Loader2,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: signOut, isPending } = useSignOut();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const { data: profileMe } = useProfileMe();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const params = useParams();
  const locale = params.locale as string;

  const isBarber = !!barberProfile;
  const isAdmin = profileMe?.role === "ADMIN";
  const isLoading = userLoading || statsLoading;

  // Show loading while checking user and barber status
  if (userLoading || barberLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is a barber, show the new BarberDashboard
  if (isBarber) {
    return <BarberDashboard locale={locale} />;
  }

  // Otherwise, show the client/admin dashboard
  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {user?.id && <NotificationPanel userId={user.id} />}
          <Button
            variant="outline"
            onClick={() => signOut()}
            disabled={isPending}
          >
            {isPending ? "Saindo..." : "Sair"}
          </Button>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-xl font-semibold">
              Olá
              {profileMe?.fullName
                ? `, ${profileMe.fullName.split(" ")[0]}`
                : ""}
              ! 👋
            </h2>
            <p className="text-muted-foreground">
              Você está logado como: <strong>{user?.email}</strong>
            </p>
          </div>
          <Link href={`/${locale}/profile`}>
            <Button variant="outline" size="sm">
              <UserCog className="mr-2 h-4 w-4" />
              Meu Perfil
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading Stats */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
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

      {/* Admin Section - Shop Overview */}
      {!isLoading && isAdmin && stats?.admin && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Visão Geral da Barbearia
          </h2>
          <AdminOverview stats={stats.admin} />
        </section>
      )}

      {/* Client Stats Section */}
      {!isLoading && stats?.client && stats.client.totalVisits > 0 && (
        <section>
          <ClientStatsOverview stats={stats.client} locale={locale} />
        </section>
      )}

      {/* Quick Actions - Scheduling */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Agendamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href={`/${locale}/agendar`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="p-2 bg-primary/10 rounded-full w-fit mb-2">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Agendar</CardTitle>
                <CardDescription>
                  Marque um novo horário com seu barbeiro favorito
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/${locale}/meus-agendamentos`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="p-2 bg-primary/10 rounded-full w-fit mb-2">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Meus Agendamentos</CardTitle>
                <CardDescription>
                  Veja e gerencie seus agendamentos futuros
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>

      {/* Admin Quick Actions */}
      {isAdmin && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Administração</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href={`/${locale}/admin/barbearia/horarios`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-full w-fit mb-2">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Horários da Barbearia</CardTitle>
                  <CardDescription>
                    Configure horário global e fechamentos por data
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href={`/${locale}/admin/barbearia/servicos`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-full w-fit mb-2">
                    <Scissors className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Serviços</CardTitle>
                  <CardDescription>
                    Gerencie os serviços oferecidos pela barbearia
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
