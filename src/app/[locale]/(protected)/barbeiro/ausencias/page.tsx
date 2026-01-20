"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  useBarberAbsences,
  useCreateBarberAbsence,
  useDeleteBarberAbsence,
} from "@/hooks/useBarberAbsences";
import {
  formatDateToString,
  getBrazilDateString,
  parseDateString,
} from "@/utils/time-slots";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { cn } from "@/lib/utils";
import {
  CalendarOff,
  Trash2,
  Menu,
  Loader2,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function BarberAbsencesPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const startDate = useMemo(() => getBrazilDateString(), []);
  const endDate = useMemo(() => {
    const base = parseDateString(startDate);
    return formatDateToString(addDays(base, 90));
  }, [startDate]);

  const { data: absences = [], isLoading: absencesLoading } = useBarberAbsences(
    startDate,
    endDate,
  );

  const createAbsence = useCreateBarberAbsence();
  const deleteAbsence = useDeleteBarberAbsence();

  const [date, setDate] = useState<string>(startDate);
  const [allDay, setAllDay] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [reason, setReason] = useState<string>("");

  const isLoading = userLoading || barberLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const handleCreate = async () => {
    try {
      await createAbsence.mutateAsync({
        date,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
        reason: reason.trim().length ? reason.trim() : null,
      });
      toast.success("Ausência cadastrada");
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao cadastrar ausência",
      );
    }
  };

  // Separate upcoming and past absences
  const upcomingAbsences = absences.filter((a) => a.date >= startDate);
  const totalAbsences = absences.length;

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          {/* Logo (desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Gold Mustache"
                width={40}
                height={40}
                className="rounded-full"
              />
              <BrandWordmark className="text-xl">GOLD MUSTACHE</BrandWordmark>
            </Link>
          </div>

          {/* Mobile Title */}
          <div className="lg:hidden flex items-center gap-2">
            <CalendarOff className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-bold">Ausências</h1>
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block flex-1 text-center">
            <h1 className="text-xl font-bold flex items-center justify-center gap-2">
              <CalendarOff className="h-5 w-5 text-amber-500" />
              Ausências
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Quick Links */}
            <Link
              href={`/${locale}/barbeiro/agendar`}
              className="hidden lg:block"
            >
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </Link>
            <Link
              href={`/${locale}/barbeiro/horarios`}
              className="hidden lg:block"
            >
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Meus Horários
              </Button>
            </Link>
            <Link href={`/${locale}/barbeiro`} className="hidden lg:block">
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Minha Agenda
              </Button>
            </Link>

            {user?.id && <NotificationPanel userId={user.id} />}

            <Button
              variant="ghost"
              onClick={() => router.push(`/${locale}/barbeiro`)}
              className="lg:hidden text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Voltar
            </Button>
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

      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Page Title - Desktop */}
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">Gerenciar Ausências</h2>
          <p className="text-zinc-400 mt-1">
            Cadastre suas folgas, férias ou períodos de indisponibilidade
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* Cadastrar ausência */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Nova Ausência</h2>
                  <p className="text-sm text-zinc-500">
                    Bloqueie horários na sua agenda
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="absence-date" className="text-zinc-300">
                    <Calendar className="h-4 w-4 inline mr-2 text-amber-500" />
                    Data
                  </Label>
                  <Input
                    id="absence-date"
                    type="date"
                    value={date}
                    min={startDate}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>

                <label className="flex items-center gap-3 text-sm cursor-pointer p-3 rounded-xl bg-zinc-900/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="h-5 w-5 rounded border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                  />
                  <div>
                    <span className="text-zinc-200 font-medium">
                      Dia inteiro
                    </span>
                    <p className="text-xs text-zinc-500">
                      Bloqueia todos os horários do dia
                    </p>
                  </div>
                </label>

                <div
                  className={cn(
                    "grid grid-cols-2 gap-4 transition-opacity",
                    allDay && "opacity-40 pointer-events-none",
                  )}
                >
                  <div className="grid gap-2">
                    <Label
                      htmlFor="absence-start"
                      className="text-zinc-400 text-sm"
                    >
                      <Clock className="h-3 w-3 inline mr-1" />
                      Início
                    </Label>
                    <Input
                      id="absence-start"
                      type="time"
                      value={startTime}
                      disabled={allDay}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor="absence-end"
                      className="text-zinc-400 text-sm"
                    >
                      <Clock className="h-3 w-3 inline mr-1" />
                      Fim
                    </Label>
                    <Input
                      id="absence-end"
                      type="time"
                      value={endTime}
                      disabled={allDay}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="absence-reason" className="text-zinc-300">
                    Motivo (opcional)
                  </Label>
                  <Input
                    id="absence-reason"
                    value={reason}
                    placeholder="Ex.: viagem, médico, folga..."
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={createAbsence.isPending}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold h-12"
                >
                  {createAbsence.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Ausência
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Info Card - Desktop Only */}
            <div className="hidden lg:block bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Como funciona</h3>
              </div>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Ausências bloqueiam automaticamente os horários na sua
                    agenda
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Clientes não conseguirão agendar nos períodos de ausência
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Você pode remover uma ausência a qualquer momento</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Agendamentos existentes não são cancelados automaticamente
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column - Absences List */}
          <div className="lg:col-span-7 xl:col-span-8 mt-6 lg:mt-0">
            {/* Stats Header - Desktop */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarOff className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-semibold">Próximas Ausências</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">
                  {totalAbsences === 0
                    ? "Nenhuma ausência"
                    : `${totalAbsences} ausência${totalAbsences !== 1 ? "s" : ""} nos próximos 90 dias`}
                </span>
              </div>
            </div>

            {/* Mobile Title */}
            <div className="lg:hidden mb-4">
              <h2 className="text-lg font-semibold">Próximas ausências</h2>
            </div>

            <div className="bg-zinc-800/50 rounded-2xl border border-zinc-700/50 overflow-hidden">
              {absencesLoading ? (
                <div className="flex items-center justify-center gap-2 text-zinc-400 p-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando ausências...
                </div>
              ) : upcomingAbsences.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 lg:p-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                    <CalendarOff className="h-8 w-8 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                    Nenhuma ausência cadastrada
                  </h3>
                  <p className="text-sm text-zinc-500 max-w-sm">
                    Quando precisar se ausentar, cadastre aqui para bloquear
                    automaticamente os agendamentos.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-700/50">
                  {upcomingAbsences.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-4 p-4 lg:p-5 hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Date Badge */}
                        <div className="hidden sm:flex flex-col items-center justify-center h-14 w-14 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <span className="text-xs text-amber-400 font-medium">
                            {formatDateDdMmYyyyFromIsoDateLike(a.date)
                              .split("/")[1]
                              .toUpperCase()}
                          </span>
                          <span className="text-xl font-bold text-amber-500">
                            {
                              formatDateDdMmYyyyFromIsoDateLike(a.date).split(
                                "/",
                              )[0]
                            }
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="font-medium text-white flex items-center gap-2 flex-wrap">
                            <span className="sm:hidden">
                              {formatDateDdMmYyyyFromIsoDateLike(a.date)}
                            </span>
                            <span className="hidden sm:inline">
                              {new Date(
                                `${a.date}T12:00:00`,
                              ).toLocaleDateString("pt-BR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              })}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                a.startTime && a.endTime
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                              )}
                            >
                              {a.startTime && a.endTime
                                ? `${a.startTime}–${a.endTime}`
                                : "Dia inteiro"}
                            </span>
                          </div>
                          {a.reason && (
                            <div className="text-sm text-zinc-400 mt-1 truncate max-w-xs lg:max-w-md">
                              {a.reason}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAbsence.mutate(a.id)}
                        disabled={deleteAbsence.isPending}
                        className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Remover</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <BarberSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        locale={locale}
      />
    </div>
  );
}
