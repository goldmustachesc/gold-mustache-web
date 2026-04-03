"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  useMyWorkingHours,
  useUpdateMyWorkingHours,
} from "@/hooks/useBarberWorkingHours";
import { cn } from "@/lib/utils";
import {
  Clock,
  Loader2,
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
    isWorking: day.value !== 0,
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

  const [draft, setDraft] = useState<WorkingHoursDraft[]>(createDefaultDraft());
  const [initialized, setInitialized] = useState(false);

  usePrivateHeader({
    title: "Meus Horários",
    icon: Clock,
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

  useEffect(() => {
    if (workingHours && !initialized) {
      setDraft(workingHours.map(toWorkingHoursDraft));
      setInitialized(true);
    }
  }, [workingHours, initialized]);

  const isLoading = userLoading || barberLoading || hoursLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    <div>
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">
            Configurar Horários de Trabalho
          </h2>
          <p className="text-muted-foreground mt-1">
            Defina seus dias e horários de atendimento para que os clientes
            possam agendar
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-muted/50 rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Resumo da Semana</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Dias de trabalho
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {workingDays}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Horas por semana
                  </span>
                  <span className="text-xl font-bold text-primary">
                    ~{totalHours}h
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3">
                  Visão da semana
                </p>
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
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-muted text-muted-foreground",
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

            <div className="bg-card/30 rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Como funciona</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>
                    Configure os dias que você trabalha marcando a opção
                    &quot;Trabalho neste dia&quot;
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>
                    Defina o horário de início e fim do seu expediente
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Coffee className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Adicione um intervalo para almoço se necessário</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>
                    Os clientes só poderão agendar nos horários definidos
                  </span>
                </li>
              </ul>
            </div>

            <div className="sticky top-24">
              <Button
                onClick={handleSave}
                disabled={updateHours.isPending}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold text-lg rounded-xl"
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

          <div className="lg:col-span-8 xl:col-span-9">
            <div className="lg:hidden mb-6">
              <p className="text-sm text-muted-foreground">
                Configure os dias e horários que você está disponível para
                atendimento.
              </p>
            </div>

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
                        ? "border-border bg-card/30"
                        : "border-border bg-background/50 opacity-75",
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold",
                            day.isWorking
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {dayInfo?.shortLabel}
                        </div>
                        <span
                          className={cn(
                            "font-medium",
                            !day.isWorking && "text-muted-foreground",
                          )}
                        >
                          {dayInfo?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={day.isWorking}
                          onCheckedChange={(checked) =>
                            updateDay(day.dayOfWeek, { isWorking: checked })
                          }
                        />
                        <span
                          className={cn(
                            day.isWorking
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          Ativo
                        </span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "space-y-4 transition-opacity",
                        !day.isWorking && "opacity-40 pointer-events-none",
                      )}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`start-${day.dayOfWeek}`}
                            className="text-muted-foreground text-xs"
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
                            className="bg-background border-border text-foreground focus:border-primary h-11"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`end-${day.dayOfWeek}`}
                            className="text-muted-foreground text-xs"
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
                            className="bg-background border-border text-foreground focus:border-primary h-11"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm p-3 min-h-11 rounded-lg bg-background/50 border border-border">
                        <Coffee className="h-4 w-4 text-muted-foreground" />
                        <Switch
                          checked={day.hasBreak}
                          onCheckedChange={(checked) =>
                            updateDay(day.dayOfWeek, { hasBreak: checked })
                          }
                          disabled={!day.isWorking}
                        />
                        <span className="text-muted-foreground">Intervalo</span>
                      </div>

                      <div
                        className={cn(
                          "grid grid-cols-2 gap-3 transition-opacity",
                          !day.hasBreak && "opacity-40 pointer-events-none",
                        )}
                      >
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`break-start-${day.dayOfWeek}`}
                            className="text-muted-foreground text-xs"
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
                            className="bg-background border-border text-foreground focus:border-primary h-11"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`break-end-${day.dayOfWeek}`}
                            className="text-muted-foreground text-xs"
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
                            className="bg-background border-border text-foreground focus:border-primary h-11"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:hidden mt-6">
              <Button
                onClick={handleSave}
                disabled={updateHours.isPending}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold text-lg rounded-xl"
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
    </div>
  );
}
