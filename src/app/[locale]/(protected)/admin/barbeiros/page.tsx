"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import { useBarbers } from "@/hooks/useBooking";
import { Clock, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AdminBarbersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfileMe();
  const { data: barbers = [], isLoading: barbersLoading } = useBarbers();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  useEffect(() => {
    if (!profileLoading && user && profile?.role !== "ADMIN") {
      toast.error("Acesso restrito a administradores");
      router.push(`/${locale}/dashboard`);
    }
  }, [profile, profileLoading, user, router, locale]);

  const isLoading = userLoading || profileLoading || barbersLoading;

  if (isLoading || !user || profile?.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Gerenciar Barbeiros</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/admin/barbearia/horarios`)}
          >
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Barbeiros</CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecione um barbeiro para configurar seus horários de
              atendimento.
            </p>
          </CardHeader>
          <CardContent>
            {barbers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum barbeiro cadastrado.
              </p>
            ) : (
              <div className="space-y-3">
                {barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      {barber.avatarUrl ? (
                        <Image
                          src={barber.avatarUrl}
                          alt={barber.name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <span className="text-lg font-medium text-muted-foreground">
                            {barber.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{barber.name}</span>
                    </div>
                    <Link
                      href={`/${locale}/admin/barbeiros/${barber.id}/horarios`}
                    >
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-2" />
                        Configurar Horários
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
