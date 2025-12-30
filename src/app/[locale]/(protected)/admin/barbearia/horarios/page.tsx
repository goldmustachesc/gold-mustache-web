"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import {
  useAdminShopClosures,
  useAdminShopHours,
  useCreateAdminShopClosure,
  useDeleteAdminShopClosure,
  useUpdateAdminShopHours,
} from "@/hooks/useAdminShopConfig";
import type { ShopHoursData } from "@/types/booking";
import {
  formatDateToString,
  getBrazilDateString,
  parseDateString,
} from "@/utils/time-slots";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";
import { CalendarOff, Save, Trash2, Users } from "lucide-react";
import Link from "next/link";

const WEEKDAYS: Array<{ dayOfWeek: number; label: string }> = [
  { dayOfWeek: 0, label: "Domingo" },
  { dayOfWeek: 1, label: "Segunda" },
  { dayOfWeek: 2, label: "Terça" },
  { dayOfWeek: 3, label: "Quarta" },
  { dayOfWeek: 4, label: "Quinta" },
  { dayOfWeek: 5, label: "Sexta" },
  { dayOfWeek: 6, label: "Sábado" },
];

const DEFAULT_OPEN_START_TIME = "09:00";
const DEFAULT_OPEN_END_TIME = "18:00";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function normalizeShopHours(days: ShopHoursData[]): ShopHoursData[] {
  const byDow = new Map(days.map((d) => [d.dayOfWeek, d]));
  return WEEKDAYS.map(({ dayOfWeek }) => {
    const existing = byDow.get(dayOfWeek);
    if (existing) {
      // Defensive: if a day is marked open but times are null, align to UI defaults.
      if (existing.isOpen && (!existing.startTime || !existing.endTime)) {
        return {
          ...existing,
          startTime: existing.startTime ?? DEFAULT_OPEN_START_TIME,
          endTime: existing.endTime ?? DEFAULT_OPEN_END_TIME,
        };
      }
      return existing;
    }
    return {
      id: `missing-${dayOfWeek}`,
      dayOfWeek,
      isOpen: false,
      startTime: DEFAULT_OPEN_START_TIME,
      endTime: DEFAULT_OPEN_END_TIME,
      breakStart: null,
      breakEnd: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
  });
}

export default function AdminShopHoursPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfileMe();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  useEffect(() => {
    if (!profileLoading && profile && profile.role !== "ADMIN") {
      toast.error("Acesso restrito a administradores");
      router.push(`/${locale}/dashboard`);
    }
  }, [profile, profileLoading, router, locale]);

  const { data: shopHoursRaw = [], isLoading: hoursLoading } =
    useAdminShopHours();
  const updateHours = useUpdateAdminShopHours();

  const shopHours = useMemo(
    () => normalizeShopHours(shopHoursRaw),
    [shopHoursRaw],
  );
  const [draft, setDraft] = useState<ShopHoursData[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize draft from server data only once
  useEffect(() => {
    if (shopHoursRaw.length > 0 && !initialized) {
      setDraft(shopHours);
      setInitialized(true);
    }
  }, [shopHours, shopHoursRaw.length, initialized]);

  const startDate = useMemo(() => getBrazilDateString(), []);
  const endDate = useMemo(() => {
    const base = parseDateString(startDate);
    return formatDateToString(addDays(base, 90));
  }, [startDate]);

  const { data: closures = [], isLoading: closuresLoading } =
    useAdminShopClosures(startDate, endDate);
  const createClosure = useCreateAdminShopClosure();
  const deleteClosure = useDeleteAdminShopClosure();

  const [closureDate, setClosureDate] = useState<string>(startDate);
  const [closureAllDay, setClosureAllDay] = useState<boolean>(true);
  const [closureStart, setClosureStart] = useState<string>("09:00");
  const [closureEnd, setClosureEnd] = useState<string>("18:00");
  const [closureReason, setClosureReason] = useState<string>("");

  const isLoading = userLoading || profileLoading;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="container mx-auto max-w-4xl p-8">
        <p className="text-destructive">Erro ao carregar perfil.</p>
      </div>
    );
  }

  if (!profile || profile.role !== "ADMIN") {
    return null;
  }

  const updateDay = (dayOfWeek: number, patch: Partial<ShopHoursData>) => {
    setDraft((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)),
    );
  };

  const handleSaveHours = async () => {
    try {
      await updateHours.mutateAsync({
        days: draft.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isOpen: d.isOpen,
          // Keep persisted values consistent with what the inputs display.
          startTime: d.isOpen ? (d.startTime ?? DEFAULT_OPEN_START_TIME) : null,
          endTime: d.isOpen ? (d.endTime ?? DEFAULT_OPEN_END_TIME) : null,
          breakStart: d.breakStart,
          breakEnd: d.breakEnd,
        })),
      });
      toast.success("Horários salvos");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar horários",
      );
    }
  };

  const handleCreateClosure = async () => {
    try {
      await createClosure.mutateAsync({
        date: closureDate,
        startTime: closureAllDay ? null : closureStart,
        endTime: closureAllDay ? null : closureEnd,
        reason: closureReason.trim().length ? closureReason.trim() : null,
      });
      toast.success("Fechamento cadastrado");
      setClosureReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao cadastrar fechamento",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarOff className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Horários da barbearia</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/dashboard`)}
          >
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Link to manage individual barber hours */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <h3 className="font-medium">
                Horários individuais dos barbeiros
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure horários específicos para cada barbeiro
              </p>
            </div>
            <Link href={`/${locale}/admin/barbeiros`}>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Barbeiros
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Horário padrão (por dia)</CardTitle>
            <Button
              onClick={handleSaveHours}
              disabled={updateHours.isPending || hoursLoading || !initialized}
            >
              <Save className="h-4 w-4" />
              <span className="ml-2">
                {updateHours.isPending ? "Salvando..." : "Salvar"}
              </span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {hoursLoading || !initialized ? (
              <div className="animate-pulse text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <div className="space-y-4">
                {WEEKDAYS.map(({ dayOfWeek, label }) => {
                  const d = draft.find((x) => x.dayOfWeek === dayOfWeek);
                  if (!d) return null;

                  return (
                    <div
                      key={dayOfWeek}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{label}</div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={d.isOpen}
                            onChange={(e) => {
                              const isOpen = e.target.checked;
                              updateDay(dayOfWeek, {
                                isOpen,
                                ...(isOpen
                                  ? {
                                      startTime:
                                        d.startTime ?? DEFAULT_OPEN_START_TIME,
                                      endTime:
                                        d.endTime ?? DEFAULT_OPEN_END_TIME,
                                    }
                                  : {}),
                              });
                            }}
                          />
                          Aberto
                        </label>
                      </div>

                      <div
                        className={cn(
                          "grid grid-cols-1 sm:grid-cols-2 gap-4",
                          !d.isOpen && "opacity-50",
                        )}
                      >
                        <div className="grid gap-2">
                          <Label>Início</Label>
                          <Input
                            type="time"
                            value={d.startTime ?? DEFAULT_OPEN_START_TIME}
                            disabled={!d.isOpen}
                            onChange={(e) =>
                              updateDay(dayOfWeek, {
                                startTime: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Fim</Label>
                          <Input
                            type="time"
                            value={d.endTime ?? DEFAULT_OPEN_END_TIME}
                            disabled={!d.isOpen}
                            onChange={(e) =>
                              updateDay(dayOfWeek, { endTime: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div
                        className={cn(
                          "grid grid-cols-1 sm:grid-cols-2 gap-4",
                          !d.isOpen && "opacity-50",
                        )}
                      >
                        <div className="grid gap-2">
                          <Label>Intervalo (início)</Label>
                          <Input
                            type="time"
                            value={d.breakStart ?? ""}
                            disabled={!d.isOpen}
                            onChange={(e) =>
                              updateDay(dayOfWeek, {
                                breakStart: e.target.value || null,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Intervalo (fim)</Label>
                          <Input
                            type="time"
                            value={d.breakEnd ?? ""}
                            disabled={!d.isOpen}
                            onChange={(e) =>
                              updateDay(dayOfWeek, {
                                breakEnd: e.target.value || null,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fechamentos (exceções por data)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={closureDate}
                min={startDate}
                onChange={(e) => setClosureDate(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={closureAllDay}
                onChange={(e) => setClosureAllDay(e.target.checked)}
              />
              Fechado o dia inteiro
            </label>

            <div
              className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4",
                closureAllDay && "opacity-50",
              )}
            >
              <div className="grid gap-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={closureStart}
                  disabled={closureAllDay}
                  onChange={(e) => setClosureStart(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={closureEnd}
                  disabled={closureAllDay}
                  onChange={(e) => setClosureEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Motivo (opcional)</Label>
              <Input
                value={closureReason}
                placeholder="Ex.: feriado, manutenção..."
                onChange={(e) => setClosureReason(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreateClosure}
              disabled={createClosure.isPending}
            >
              {createClosure.isPending ? "Salvando..." : "Cadastrar fechamento"}
            </Button>

            <div className="pt-4">
              {closuresLoading ? (
                <div className="animate-pulse text-muted-foreground">
                  Carregando...
                </div>
              ) : closures.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nenhum fechamento cadastrado.
                </div>
              ) : (
                <div className="space-y-3">
                  {closures.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">
                          {formatDateDdMmYyyyFromIsoDateLike(c.date)}{" "}
                          {c.startTime && c.endTime
                            ? `• ${c.startTime}–${c.endTime}`
                            : "• Dia inteiro"}
                        </div>
                        {c.reason && (
                          <div className="text-sm text-muted-foreground truncate">
                            {c.reason}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteClosure.mutate(c.id)}
                        disabled={deleteClosure.isPending}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
