"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  useMyWorkingHours,
  useUpdateMyWorkingHours,
} from "@/hooks/useBarberWorkingHours";
import { cn } from "@/lib/utils";
import {
  Clock,
  Menu,
  Loader2,
  Plus,
  CalendarDays,
  Coffee,
  CheckCircle2,
  Info,
  Save,
} from "lucide-react";
import type { BarberWorkingHoursDay } from "@/types/booking";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo", shortLabel: "Dom" },
  { value: 1, label: "Segunda-feira", shortLabel: "Seg" },
  { value: 2, label: "Terça-feira", shortLabel: "Ter" },
  { value: 3, label: "Quarta-feira", shortLabel: "Qua" },
  { value: 4, label: "Quinta-feira", shortLabel: "Qui" },
  { value: 5, label: "Sexta-feira", shortLabel: "Sex" },
  { value: 6, label: "Sábado", shortLabel: "Sáb" },
];

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "18:00";
const DEFAULT_BREAK_START = "12:00";
const DEFAULT_BREAK_END = "13:00";

type WorkingHoursDraft = {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  hasBreak: boolean;
};

function toWorkingHoursDraft(day: BarberWorkingHoursDay): WorkingHoursDraft {
  return {
    dayOfWeek: day.dayOfWeek,
    isWorking: day.isWorking,
    startTime: day.startTime ?? DEFAULT_START_TIME,
    endTime: day.endTime ?? DEFAULT_END_TIME,
    breakStart: day.breakStart ?? DEFAULT_BREAK_START,
    breakEnd: day.breakEnd ?? DEFAULT_BREAK_END,
    hasBreak: !!(day.breakStart && day.breakEnd),
  };
}

function createDefaultDraft(): WorkingHoursDraft[] {
  return DAYS_OF_WEEK.map((day) => ({
    dayOfWeek: day.value,
    isWorking: day.value !== 0, // Closed on Sunday by default
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    breakStart: DEFAULT_BREAK_START,
    breakEnd: DEFAULT_BREAK_END,
    hasBreak: true,
  }));
}

export default function BarberWorkingHoursPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const { data: workingHours, isLoading: hoursLoading } = useMyWorkingHours();
  const updateHours = useUpdateMyWorkingHours();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState<WorkingHoursDraft[]>(createDefaultDraft());
  const [initialized, setInitialized] = useState(false);

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

  // Initialize draft from server data
  useEffect(() => {
    if (workingHours && !initialized) {
      setDraft(workingHours.map(toWorkingHoursDraft));
      setInitialized(true);
    }
  }, [workingHours, initialized]);

  const isLoading = userLoading || barberLoading || hoursLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const updateDay = (dayOfWeek: number, patch: Partial<WorkingHoursDraft>) => {
    setDraft((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)),
    );
  };

  const handleSave = async () => {
    try {
      await updateHours.mutateAsync({
        days: draft.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isWorking: d.isWorking,
          startTime: d.isWorking ? d.startTime : null,
          endTime: d.isWorking ? d.endTime : null,
          breakStart: d.isWorking && d.hasBreak ? d.breakStart : null,
          breakEnd: d.isWorking && d.hasBreak ? d.breakEnd : null,
        })),
      });
      toast.success("Horários salvos com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar horários",
      );
    }
  };

  // Calculate stats
  const workingDays = draft.filter((d) => d.isWorking).length;
  const totalHours = draft
    .filter((d) => d.isWorking)
    .reduce((acc, d) => {
      const start = Number.parseInt(d.startTime.split(":")[0], 10);
      const end = Number.parseInt(d.endTime.split(":")[0], 10);
      const breakTime = d.hasBreak
        ? Number.parseInt(d.breakEnd.split(":")[0], 10) -
          Number.parseInt(d.breakStart.split(":")[0], 10)
        : 0;
      return acc + (end - start - breakTime);
    }, 0);

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
              <span className="font-playfair text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                GOLD MUSTACHE
              </span>
            </Link>
          </div>

          {/* Mobile Title */}
          <div className="lg:hidden flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-bold">Meus Horários</h1>
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block flex-1 text-center">
            <h1 className="text-xl font-bold flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Meus Horários
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
              href={`/${locale}/barbeiro/ausencias`}
              className="hidden lg:block"
            >
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Ausências
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
          <h2 className="text-2xl font-bold">
            Configurar Horários de Trabalho
          </h2>
          <p className="text-zinc-400 mt-1">
            Defina seus dias e horários de atendimento para que os clientes
            possam agendar
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Stats & Info (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6">
            {/* Quick Stats */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Resumo da Semana</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Dias de trabalho</span>
                  <span className="text-xl font-bold text-amber-500">
                    {workingDays}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Horas por semana</span>
                  <span className="text-xl font-bold text-amber-500">
                    ~{totalHours}h
                  </span>
                </div>
              </div>

              {/* Week Overview */}
              <div className="mt-6 pt-4 border-t border-zinc-700/50">
                <p className="text-xs text-zinc-500 mb-3">Visão da semana</p>
                <div className="flex gap-1">
                  {draft.map((day) => {
                    const dayInfo = DAYS_OF_WEEK.find(
                      (d) => d.value === day.dayOfWeek,
                    );
                    return (
                      <div
                        key={day.dayOfWeek}
                        className={cn(
                          "flex-1 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors",
                          day.isWorking
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-zinc-800 text-zinc-600",
                        )}
                        title={dayInfo?.label}
                      >
                        {dayInfo?.shortLabel}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Como funciona</h3>
              </div>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Configure os dias que você trabalha marcando a opção
                    "Trabalho neste dia"
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Defina o horário de início e fim do seu expediente
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Coffee className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>Adicione um intervalo para almoço se necessário</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Os clientes só poderão agendar nos horários definidos
                  </span>
                </li>
              </ul>
            </div>

            {/* Save Button - Desktop Sticky */}
            <div className="sticky top-24">
              <Button
                onClick={handleSave}
                disabled={updateHours.isPending}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg rounded-xl"
              >
                {updateHours.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Salvar Horários
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column - Days Grid */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* Mobile Description */}
            <div className="lg:hidden mb-6">
              <p className="text-sm text-zinc-400">
                Configure os dias e horários que você está disponível para
                atendimento.
              </p>
            </div>

            {/* Days Grid - Desktop: 2 columns */}
            <div className="grid gap-4 lg:grid-cols-2">
              {draft.map((day) => {
                const dayInfo = DAYS_OF_WEEK.find(
                  (d) => d.value === day.dayOfWeek,
                );
                return (
                  <div
                    key={day.dayOfWeek}
                    className={cn(
                      "rounded-2xl border p-5 transition-all",
                      day.isWorking
                        ? "border-zinc-700/50 bg-zinc-800/30"
                        : "border-zinc-800 bg-zinc-900/50 opacity-75",
                    )}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold",
                            day.isWorking
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-zinc-800 text-zinc-600",
                          )}
                        >
                          {dayInfo?.shortLabel}
                        </div>
                        <span
                          className={cn(
                            "font-medium",
                            !day.isWorking && "text-zinc-500",
                          )}
                        >
                          {dayInfo?.label}
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.isWorking}
                          onChange={(e) =>
                            updateDay(day.dayOfWeek, {
                              isWorking: e.target.checked,
                            })
                          }
                          className="h-5 w-5 rounded border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                        />
                        <span
                          className={cn(
                            "hidden sm:inline",
                            day.isWorking ? "text-zinc-300" : "text-zinc-500",
                          )}
                        >
                          Ativo
                        </span>
                      </label>
                    </div>

                    <div
                      className={cn(
                        "space-y-4 transition-opacity",
                        !day.isWorking && "opacity-40 pointer-events-none",
                      )}
                    >
                      {/* Working Hours */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`start-${day.dayOfWeek}`}
                            className="text-zinc-500 text-xs"
                          >
                            Início
                          </Label>
                          <Input
                            id={`start-${day.dayOfWeek}`}
                            type="time"
                            value={day.startTime}
                            onChange={(e) =>
                              updateDay(day.dayOfWeek, {
                                startTime: e.target.value,
                              })
                            }
                            disabled={!day.isWorking}
                            className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-500 h-10"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`end-${day.dayOfWeek}`}
                            className="text-zinc-500 text-xs"
                          >
                            Fim
                          </Label>
                          <Input
                            id={`end-${day.dayOfWeek}`}
                            type="time"
                            value={day.endTime}
                            onChange={(e) =>
                              updateDay(day.dayOfWeek, {
                                endTime: e.target.value,
                              })
                            }
                            disabled={!day.isWorking}
                            className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-500 h-10"
                          />
                        </div>
                      </div>

                      {/* Break Toggle */}
                      <label className="flex items-center gap-2 text-sm cursor-pointer p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <Coffee className="h-4 w-4 text-zinc-500" />
                        <input
                          type="checkbox"
                          checked={day.hasBreak}
                          onChange={(e) =>
                            updateDay(day.dayOfWeek, {
                              hasBreak: e.target.checked,
                            })
                          }
                          disabled={!day.isWorking}
                          className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                        />
                        <span className="text-zinc-400">Intervalo</span>
                      </label>

                      {/* Break Times */}
                      <div
                        className={cn(
                          "grid grid-cols-2 gap-3 transition-opacity",
                          !day.hasBreak && "opacity-40 pointer-events-none",
                        )}
                      >
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`break-start-${day.dayOfWeek}`}
                            className="text-zinc-500 text-xs"
                          >
                            Início intervalo
                          </Label>
                          <Input
                            id={`break-start-${day.dayOfWeek}`}
                            type="time"
                            value={day.breakStart}
                            onChange={(e) =>
                              updateDay(day.dayOfWeek, {
                                breakStart: e.target.value,
                              })
                            }
                            disabled={!day.isWorking || !day.hasBreak}
                            className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-500 h-10"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`break-end-${day.dayOfWeek}`}
                            className="text-zinc-500 text-xs"
                          >
                            Fim intervalo
                          </Label>
                          <Input
                            id={`break-end-${day.dayOfWeek}`}
                            type="time"
                            value={day.breakEnd}
                            onChange={(e) =>
                              updateDay(day.dayOfWeek, {
                                breakEnd: e.target.value,
                              })
                            }
                            disabled={!day.isWorking || !day.hasBreak}
                            className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-500 h-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Save Button */}
            <div className="lg:hidden mt-6">
              <Button
                onClick={handleSave}
                disabled={updateHours.isPending}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg rounded-xl"
              >
                {updateHours.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Salvar Horários
                  </>
                )}
              </Button>
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
