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
import {
  Calendar,
  CalendarOff,
  ClipboardList,
  Scissors,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DashboardPage() {
  const { data: user, isLoading } = useUser();
  const { mutate: signOut, isPending } = useSignOut();
  const { data: barberProfile } = useBarberProfile();
  const { data: profileMe } = useProfileMe();
  const params = useParams();
  const locale = params.locale as string;

  const isBarber = !!barberProfile;
  const isAdmin = profileMe?.role === "ADMIN";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button
          variant="outline"
          onClick={() => signOut()}
          disabled={isPending}
        >
          {isPending ? "Saindo..." : "Sair"}
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6 mb-8">
        <h2 className="mb-4 text-xl font-semibold">Bem-vindo!</h2>
        <p className="text-muted-foreground">
          Você está logado como: <strong>{user?.email}</strong>
        </p>
      </div>

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

      {isBarber && (
        <>
          <h2 className="text-xl font-semibold mb-4 mt-8">Área Profissional</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href={`/${locale}/barbeiro`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-full w-fit mb-2">
                    <Scissors className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Minha Agenda</CardTitle>
                  <CardDescription>
                    Gerencie seus atendimentos e horários
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href={`/${locale}/barbeiro/ausencias`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-full w-fit mb-2">
                    <CalendarOff className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Ausências</CardTitle>
                  <CardDescription>
                    Cadastre folgas e indisponibilidades por data/horário
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </>
      )}

      {isAdmin && (
        <>
          <h2 className="text-xl font-semibold mb-4 mt-8">Administração</h2>
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
          </div>
        </>
      )}
    </div>
  );
}
