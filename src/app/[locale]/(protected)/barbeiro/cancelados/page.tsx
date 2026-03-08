"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CancelledAppointmentCard } from "@/components/barber/CancelledAppointmentCard";
import { Button } from "@/components/ui/button";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { useUser } from "@/hooks/useAuth";
import { useCancelledAppointments } from "@/hooks/useCancelledAppointments";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  XCircle,
  Plus,
  CalendarX,
} from "lucide-react";
import { toast } from "sonner";

export default function CanceladosPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [page, setPage] = useState(1);

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const {
    data: response,
    isLoading: appointmentsLoading,
    error,
  } = useCancelledAppointments(page);

  const appointments = response?.data ?? [];
  const meta = response?.meta;
  const totalAppointments = meta?.total ?? appointments.length;

  usePrivateHeader({
    title: "Cancelados",
    icon: XCircle,
    backHref: `/${locale}/barbeiro`,
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  useEffect(() => {
    if (!barberLoading && user && !barberProfile) {
      toast.error("Acesso restrito a barbeiros");
      router.push(`/${locale}/dashboard`);
    }
  }, [barberProfile, barberLoading, user, router, locale]);

  const isLoading = userLoading || barberLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">
                Agendamentos Cancelados
              </h2>
              <p className="text-muted-foreground">
                {totalAppointments === 0
                  ? "Nenhum agendamento cancelado encontrado"
                  : `${totalAppointments} agendamento${totalAppointments > 1 ? "s" : ""} cancelado${totalAppointments > 1 ? "s" : ""}`}
              </p>
            </div>

            <Link href={`/${locale}/barbeiro/agendar`} className="lg:hidden">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </Link>
          </div>
        </div>

        {appointmentsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-card/30 border border-border">
            <XCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-400 font-medium text-lg">
              Erro ao carregar cancelamentos
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Tente novamente mais tarde
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-card/30 border border-border">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <CalendarX className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold text-xl mb-2">
              Nenhum agendamento cancelado
            </p>
            <p className="text-muted-foreground text-sm max-w-md">
              Quando agendamentos forem cancelados por você ou seus clientes,
              eles aparecerão aqui para referência e histórico.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {appointments.map((appointment) => (
                <CancelledAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                />
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-border hover:bg-accent"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.totalPages}
                  className="border-border hover:bg-accent"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
