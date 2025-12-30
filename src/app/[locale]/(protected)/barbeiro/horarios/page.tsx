"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  useMyWorkingHours,
  useUpdateMyWorkingHours,
} from "@/hooks/useBarberWorkingHours";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import type { BarberWorkingHoursDay } from "@/types/booking";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Meus Horários</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/barbeiro`)}
          >
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurar horários de atendimento</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure os dias e horários que você está disponível para
              atendimento. Se não configurar, serão usados os horários padrão da
              barbearia.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {draft.map((day) => {
              const dayInfo = DAYS_OF_WEEK.find(
                (d) => d.value === day.dayOfWeek,
              );
              return (
                <div
                  key={day.dayOfWeek}
                  className={cn(
                    "rounded-lg border p-4",
                    !day.isWorking && "bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">{dayInfo?.label}</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={day.isWorking}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, {
                            isWorking: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      Trabalho neste dia
                    </label>
                  </div>

                  <div
                    className={cn(
                      "space-y-4",
                      !day.isWorking && "opacity-50 pointer-events-none",
                    )}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`start-${day.dayOfWeek}`}>
                          Início do expediente
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
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`end-${day.dayOfWeek}`}>
                          Fim do expediente
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
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={day.hasBreak}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, {
                            hasBreak: e.target.checked,
                          })
                        }
                        disabled={!day.isWorking}
                        className="h-4 w-4"
                      />
                      Intervalo para almoço
                    </label>

                    <div
                      className={cn(
                        "grid grid-cols-1 sm:grid-cols-2 gap-4",
                        !day.hasBreak && "opacity-50 pointer-events-none",
                      )}
                    >
                      <div className="grid gap-2">
                        <Label htmlFor={`break-start-${day.dayOfWeek}`}>
                          Início do intervalo
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
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`break-end-${day.dayOfWeek}`}>
                          Fim do intervalo
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
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button
              onClick={handleSave}
              disabled={updateHours.isPending}
              className="w-full"
            >
              {updateHours.isPending ? "Salvando..." : "Salvar horários"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
