"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import {
  useBarberWorkingHours,
  useUpdateBarberWorkingHours,
} from "@/hooks/useBarberWorkingHours";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Coffee,
  Info,
  Loader2,
  Save,
  Settings,
  Store,
  Users,
} from "lucide-react";
import type { BarberWorkingHoursDay } from "@/types/booking";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda-feira", short: "Seg" },
  { value: 2, label: "Terça-feira", short: "Ter" },
  { value: 3, label: "Quarta-feira", short: "Qua" },
  { value: 4, label: "Quinta-feira", short: "Qui" },
  { value: 5, label: "Sexta-feira", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
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

function calculateWorkingHours(draft: WorkingHoursDraft[]): {
  workingDays: number;
  totalHours: number;
} {
  let workingDays = 0;
  let totalMinutes = 0;

  for (const day of draft) {
    if (day.isWorking) {
      workingDays++;
      const startParts = day.startTime
        .split(":")
        .map((p) => Number.parseInt(p, 10));
      const endParts = day.endTime
        .split(":")
        .map((p) => Number.parseInt(p, 10));
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      let dayMinutes = endMinutes - startMinutes;

      if (day.hasBreak) {
        const breakStartParts = day.breakStart
          .split(":")
          .map((p) => Number.parseInt(p, 10));
        const breakEndParts = day.breakEnd
          .split(":")
          .map((p) => Number.parseInt(p, 10));
        const breakStartMinutes = breakStartParts[0] * 60 + breakStartParts[1];
        const breakEndMinutes = breakEndParts[0] * 60 + breakEndParts[1];
        dayMinutes -= breakEndMinutes - breakStartMinutes;
      }

      totalMinutes += dayMinutes;
    }
  }

  return {
    workingDays,
    totalHours: Math.round(totalMinutes / 60),
  };
}

export default function AdminBarberWorkingHoursPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";
  const barberId = params.id as string;

  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfileMe();
  const { data: barberData, isLoading: hoursLoading } =
    useBarberWorkingHours(barberId);
  const updateHours = useUpdateBarberWorkingHours();

  const [draft, setDraft] = useState<WorkingHoursDraft[]>(createDefaultDraft());
  const [initialized, setInitialized] = useState(false);

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

  // Initialize draft from server data
  useEffect(() => {
    if (barberData?.days && !initialized) {
      setDraft(barberData.days.map(toWorkingHoursDraft));
      setInitialized(true);
    }
  }, [barberData, initialized]);

  const isLoading = userLoading || profileLoading || hoursLoading;

  if (isLoading || !user || profile?.role !== "ADMIN") {
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
        barberId,
        input: {
          days: draft.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            isWorking: d.isWorking,
            startTime: d.isWorking ? d.startTime : null,
            endTime: d.isWorking ? d.endTime : null,
            breakStart: d.isWorking && d.hasBreak ? d.breakStart : null,
            breakEnd: d.isWorking && d.hasBreak ? d.breakEnd : null,
          })),
        },
      });
      toast.success("Horários salvos com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar horários",
      );
    }
  };

  const { workingDays, totalHours } = calculateWorkingHours(draft);

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/${locale}/admin/barbeiros`)}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Image
                src="/logo.png"
                alt="Gold Mustache"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                  Horários do Barbeiro
                </h1>
                {barberData?.barber && (
                  <p className="text-sm text-zinc-400">
                    {barberData.barber.name}
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={updateHours.isPending}
              className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold"
            >
              {updateHours.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block lg:w-3/12 space-y-4">
              {/* Barber Info Card */}
              {barberData?.barber && (
                <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-bold text-lg">
                      {barberData.barber.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {barberData.barber.name}
                      </h3>
                      <p className="text-sm text-zinc-400">Barbeiro</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Week Summary Card */}
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Resumo da Semana
                </h3>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayDraft = draft.find(
                      (d) => d.dayOfWeek === day.value,
                    );
                    return (
                      <div
                        key={day.value}
                        className={cn(
                          "h-10 rounded flex items-center justify-center text-xs font-medium transition-colors",
                          dayDraft?.isWorking
                            ? "bg-gradient-to-br from-amber-500/20 to-yellow-600/20 text-amber-400 border border-amber-500/30"
                            : "bg-zinc-700/30 text-zinc-500",
                        )}
                        title={day.label}
                      >
                        {day.short}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">
                      Dias de trabalho
                    </span>
                    <span className="font-semibold text-amber-400">
                      {workingDays} dias
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">
                      Horas semanais
                    </span>
                    <span className="font-semibold text-amber-400">
                      ~{totalHours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <h3 className="font-semibold text-white mb-3 text-sm">
                  Outras Configurações
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    onClick={() => router.push(`/${locale}/admin/barbeiros`)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Todos os Barbeiros
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    onClick={() =>
                      router.push(`/${locale}/admin/barbearia/horarios`)
                    }
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Horários da Barbearia
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    onClick={() =>
                      router.push(`/${locale}/admin/barbearia/configuracoes`)
                    }
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações Gerais
                  </Button>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/5 rounded-xl border border-amber-500/20 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-400 text-sm mb-1">
                      Hierarquia de Horários
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Os horários do barbeiro sobrescrevem os horários da
                      barbearia. Se não configurar, serão usados os horários
                      padrão.
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:w-9/12 space-y-4">
              {/* Mobile Info */}
              <div className="lg:hidden bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Resumo</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm">Dias:</span>
                    <span className="font-semibold text-amber-400">
                      {workingDays}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm">Horas:</span>
                    <span className="font-semibold text-amber-400">
                      ~{totalHours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4">
                <h2 className="font-semibold text-white mb-1">
                  Configurar horários de atendimento
                </h2>
                <p className="text-sm text-zinc-400">
                  Configure os dias e horários que{" "}
                  {barberData?.barber?.name || "o barbeiro"} está disponível
                  para atendimento.
                </p>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {draft.map((day) => {
                  const dayInfo = DAYS_OF_WEEK.find(
                    (d) => d.value === day.dayOfWeek,
                  );
                  return (
                    <div
                      key={day.dayOfWeek}
                      className={cn(
                        "rounded-xl border p-4 transition-all duration-200",
                        day.isWorking
                          ? "bg-zinc-800/30 border-zinc-700/50"
                          : "bg-zinc-900/50 border-zinc-800/50",
                      )}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                              day.isWorking
                                ? "bg-gradient-to-br from-amber-500 to-yellow-600 text-black"
                                : "bg-zinc-800 text-zinc-500",
                            )}
                          >
                            {dayInfo?.short}
                          </div>
                          <span className="font-medium text-white">
                            {dayInfo?.label}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs text-zinc-400">
                            {day.isWorking ? "Ativo" : "Folga"}
                          </span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={day.isWorking}
                            onChange={() =>
                              updateDay(day.dayOfWeek, {
                                isWorking: !day.isWorking,
                              })
                            }
                          />
                          <div
                            className={cn(
                              "relative w-10 h-5 rounded-full transition-colors cursor-pointer",
                              day.isWorking
                                ? "bg-gradient-to-r from-amber-500 to-yellow-600"
                                : "bg-zinc-700",
                            )}
                            aria-hidden="true"
                          >
                            <div
                              className={cn(
                                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                day.isWorking
                                  ? "translate-x-5"
                                  : "translate-x-0.5",
                              )}
                            />
                          </div>
                        </label>
                      </div>

                      {/* Working Hours */}
                      <div
                        className={cn(
                          "space-y-3 transition-opacity",
                          !day.isWorking && "opacity-40 pointer-events-none",
                        )}
                      >
                        {/* Work Hours */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label
                              htmlFor={`start-${day.dayOfWeek}`}
                              className="text-xs text-zinc-400 flex items-center gap-1 mb-1.5"
                            >
                              <Clock className="h-3 w-3" />
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
                              className="bg-zinc-900/50 border-zinc-700/50 text-white text-sm h-9 focus:border-amber-500/50 focus:ring-amber-500/20"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor={`end-${day.dayOfWeek}`}
                              className="text-xs text-zinc-400 flex items-center gap-1 mb-1.5"
                            >
                              <Clock className="h-3 w-3" />
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
                              className="bg-zinc-900/50 border-zinc-700/50 text-white text-sm h-9 focus:border-amber-500/50 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>

                        {/* Break Toggle */}
                        <label
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                            day.hasBreak
                              ? "bg-amber-500/10 border border-amber-500/20"
                              : "bg-zinc-800/50 border border-zinc-700/50",
                            !day.isWorking && "opacity-50 pointer-events-none",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={day.hasBreak}
                            disabled={!day.isWorking}
                            onChange={() =>
                              updateDay(day.dayOfWeek, {
                                hasBreak: !day.hasBreak,
                              })
                            }
                          />
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                              day.hasBreak
                                ? "bg-amber-500 border-amber-500"
                                : "border-zinc-600 bg-transparent",
                            )}
                          >
                            {day.hasBreak && (
                              <Check className="h-3 w-3 text-black" />
                            )}
                          </div>
                          <Coffee className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-xs text-zinc-300">
                            Intervalo para almoço
                          </span>
                        </label>

                        {/* Break Hours */}
                        {day.hasBreak && (
                          <div className="grid grid-cols-2 gap-3 pl-6">
                            <div>
                              <Label
                                htmlFor={`break-start-${day.dayOfWeek}`}
                                className="text-xs text-zinc-500 mb-1.5 block"
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
                                className="bg-zinc-900/50 border-zinc-700/50 text-white text-sm h-9 focus:border-amber-500/50 focus:ring-amber-500/20"
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor={`break-end-${day.dayOfWeek}`}
                                className="text-xs text-zinc-500 mb-1.5 block"
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
                                className="bg-zinc-900/50 border-zinc-700/50 text-white text-sm h-9 focus:border-amber-500/50 focus:ring-amber-500/20"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Save Button */}
              <div className="lg:hidden sticky bottom-4">
                <Button
                  onClick={handleSave}
                  disabled={updateHours.isPending}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold text-base shadow-lg shadow-amber-500/20"
                >
                  {updateHours.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Salvar horários
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
