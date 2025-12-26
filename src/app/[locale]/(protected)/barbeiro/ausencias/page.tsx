"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CalendarOff, Trash2 } from "lucide-react";

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarOff className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Ausências</h1>
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
            <CardTitle>Cadastrar ausência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="absence-date">Data</Label>
              <Input
                id="absence-date"
                type="date"
                value={date}
                min={startDate}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
              />
              Dia inteiro
            </label>

            <div
              className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4",
                allDay && "opacity-50",
              )}
            >
              <div className="grid gap-2">
                <Label htmlFor="absence-start">Início</Label>
                <Input
                  id="absence-start"
                  type="time"
                  value={startTime}
                  disabled={allDay}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="absence-end">Fim</Label>
                <Input
                  id="absence-end"
                  type="time"
                  value={endTime}
                  disabled={allDay}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="absence-reason">Motivo (opcional)</Label>
              <Input
                id="absence-reason"
                value={reason}
                placeholder="Ex.: viagem, médico..."
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Button onClick={handleCreate} disabled={createAbsence.isPending}>
              {createAbsence.isPending ? "Salvando..." : "Salvar ausência"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas ausências</CardTitle>
          </CardHeader>
          <CardContent>
            {absencesLoading ? (
              <div className="animate-pulse text-muted-foreground">
                Carregando...
              </div>
            ) : absences.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Nenhuma ausência cadastrada.
              </div>
            ) : (
              <div className="space-y-3">
                {absences.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">
                        {formatDateDdMmYyyyFromIsoDateLike(a.date)}{" "}
                        {a.startTime && a.endTime
                          ? `• ${a.startTime}–${a.endTime}`
                          : "• Dia inteiro"}
                      </div>
                      {a.reason && (
                        <div className="text-sm text-muted-foreground truncate">
                          {a.reason}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAbsence.mutate(a.id)}
                      disabled={deleteAbsence.isPending}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
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
