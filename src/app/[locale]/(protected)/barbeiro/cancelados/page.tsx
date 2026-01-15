"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";
import { CancelledAppointmentCard } from "@/components/barber/CancelledAppointmentCard";
import { Button } from "@/components/ui/button";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { useUser } from "@/hooks/useAuth";
import { useCancelledAppointments } from "@/hooks/useCancelledAppointments";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import {
  ArrowLeft,
  Loader2,
  Menu,
  XCircle,
  Plus,
  CalendarX,
} from "lucide-react";
import { toast } from "sonner";

export default function CanceladosPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    error,
  } = useCancelledAppointments();

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
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/barbeiro`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only lg:not-sr-only">Voltar</span>
            </Link>

            {/* Logo (visible on desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href={`/${locale}`} className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Gold Mustache"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <span className="font-playfair text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                  GOLD MUSTACHE
                </span>
              </Link>
            </div>

            {/* Page Title */}
            <div className="flex items-center gap-2">
              <CalendarX className="h-6 w-6 text-amber-500" />
              <h1 className="text-xl font-bold">Cancelados</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Desktop: Quick Action */}
            <Link
              href={`/${locale}/barbeiro/agendar`}
              className="hidden lg:block"
            >
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                Agendamentos Cancelados
              </h2>
              <p className="text-zinc-400">
                {appointments.length === 0
                  ? "Nenhum agendamento cancelado encontrado"
                  : `${appointments.length} agendamento${appointments.length > 1 ? "s" : ""} cancelado${appointments.length > 1 ? "s" : ""}`}
              </p>
            </div>

            {/* Mobile: Quick Action */}
            <Link href={`/${locale}/barbeiro/agendar`} className="lg:hidden">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </Link>
          </div>
        </div>

        {/* List */}
        {appointmentsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-zinc-800/30 border border-zinc-700/50">
            <XCircle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-400 font-medium text-lg">
              Erro ao carregar cancelamentos
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              Tente novamente mais tarde
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-zinc-800/30 border border-zinc-700/50">
            <div className="w-20 h-20 rounded-full bg-zinc-700/50 flex items-center justify-center mb-6">
              <CalendarX className="h-10 w-10 text-zinc-500" />
            </div>
            <p className="text-zinc-200 font-semibold text-xl mb-2">
              Nenhum agendamento cancelado
            </p>
            <p className="text-zinc-500 text-sm max-w-md">
              Quando agendamentos forem cancelados por você ou seus clientes,
              eles aparecerão aqui para referência e histórico.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {appointments.map((appointment) => (
              <CancelledAppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
