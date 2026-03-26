"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import {
  CalendarOff,
  Trash2,
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

function isValidDateParam(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function isValidTimeParam(value: string | null): value is string {
  return Boolean(value && /^\d{2}:\d{2}$/.test(value));
}

function parseAllDayParam(value: string | null): boolean | null {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

export default function BarberAbsencesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();

  usePrivateHeader({
    title: "Ausências",
    icon: CalendarOff,
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
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (prefillAppliedRef.current) return;

    const prefilledDate = searchParams.get("date");
    const prefilledStartTime = searchParams.get("startTime");
    const prefilledEndTime = searchParams.get("endTime");
    const prefilledAllDay = parseAllDayParam(searchParams.get("allDay"));

    const hasPrefilledDate = isValidDateParam(prefilledDate);
    const hasPrefilledStartTime = isValidTimeParam(prefilledStartTime);
    const hasPrefilledEndTime = isValidTimeParam(prefilledEndTime);

    if (hasPrefilledDate) {
      setDate(prefilledDate);
    }
    if (prefilledAllDay !== null) {
      setAllDay(prefilledAllDay);
    } else if (hasPrefilledStartTime || hasPrefilledEndTime) {
      setAllDay(false);
    }
    if (hasPrefilledStartTime) {
      setStartTime(prefilledStartTime);
    }
    if (hasPrefilledEndTime) {
      setEndTime(prefilledEndTime);
    }

    prefillAppliedRef.current = true;
  }, [searchParams]);

  const isLoading = userLoading || barberLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const upcomingAbsences = absences.filter((a) => a.date >= startDate);
  const totalAbsences = absences.length;

  return (
    <div>
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">Gerenciar Ausências</h2>
          <p className="text-muted-foreground mt-1">
            Cadastre suas folgas, férias ou períodos de indisponibilidade
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="bg-muted/50 rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Nova Ausência</h2>
                  <p className="text-sm text-muted-foreground">
                    Bloqueie horários na sua agenda
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="absence-date" className="text-foreground">
                    <Calendar className="h-4 w-4 inline mr-2 text-primary" />
                    Data
                  </Label>
                  <Input
                    id="absence-date"
                    type="date"
                    value={date}
                    min={startDate}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-background border-border text-foreground focus:border-primary focus:ring-primary/20"
                  />
                </div>

                <label className="flex items-center gap-3 text-sm cursor-pointer p-3 rounded-xl bg-background/50 border border-border hover:border-border transition-colors">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="h-5 w-5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background"
                  />
                  <div>
                    <span className="text-foreground font-medium">
                      Dia inteiro
                    </span>
                    <p className="text-xs text-muted-foreground">
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
                      className="text-muted-foreground text-sm"
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
                      className="bg-background border-border text-foreground focus:border-primary"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor="absence-end"
                      className="text-muted-foreground text-sm"
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
                      className="bg-background border-border text-foreground focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="absence-reason" className="text-foreground">
                    Motivo (opcional)
                  </Label>
                  <Input
                    id="absence-reason"
                    value={reason}
                    placeholder="Ex.: viagem, médico, folga..."
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={createAbsence.isPending}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold h-12"
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

            <div className="hidden lg:block bg-card/30 rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Como funciona</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
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
                  <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Agendamentos existentes não são cancelados automaticamente
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-7 xl:col-span-8 mt-6 lg:mt-0">
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarOff className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Próximas Ausências</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {totalAbsences === 0
                    ? "Nenhuma ausência"
                    : `${totalAbsences} ausência${totalAbsences !== 1 ? "s" : ""} nos próximos 90 dias`}
                </span>
              </div>
            </div>

            <div className="lg:hidden mb-4">
              <h2 className="text-lg font-semibold">Próximas ausências</h2>
            </div>

            <div className="bg-muted/50 rounded-2xl border border-border overflow-hidden">
              {absencesLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground p-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando ausências...
                </div>
              ) : upcomingAbsences.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 lg:p-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CalendarOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma ausência cadastrada
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Quando precisar se ausentar, cadastre aqui para bloquear
                    automaticamente os agendamentos.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingAbsences.map((a) => {
                    const formattedDate = formatDateDdMmYyyyFromIsoDateLike(
                      a.date,
                    );
                    const dateMatch = formattedDate.match(
                      /^(\d{2})[-/](\d{2})[-/]\d{4}$/,
                    );
                    const dayLabel = dateMatch?.[1] ?? "--";
                    const monthLabel = dateMatch?.[2] ?? "--";

                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-4 p-4 lg:p-5 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="hidden sm:flex flex-col items-center justify-center h-14 w-14 rounded-xl bg-primary/10 border border-primary/20">
                            <span className="text-xs text-primary font-medium">
                              {monthLabel.toUpperCase()}
                            </span>
                            <span className="text-xl font-bold text-primary">
                              {dayLabel}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                              <span className="sm:hidden">{formattedDate}</span>
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
                                    : "bg-primary/10 text-primary border border-primary/20",
                                )}
                              >
                                {a.startTime && a.endTime
                                  ? `${a.startTime}–${a.endTime}`
                                  : "Dia inteiro"}
                              </span>
                            </div>
                            {a.reason && (
                              <div className="text-sm text-muted-foreground mt-1 truncate max-w-xs lg:max-w-md">
                                {a.reason}
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAbsence.mutate(a.id)}
                          disabled={deleteAbsence.isPending}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0 sm:w-auto sm:px-3 sm:gap-2"
                          aria-label="Remover ausência"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Remover</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
