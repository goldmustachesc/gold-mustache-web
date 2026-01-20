"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast, Toaster } from "sonner";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
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
import {
  ArrowLeft,
  CalendarOff,
  Clock,
  Loader2,
  Menu,
  Save,
  Trash2,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Info,
  Settings,
  Plus,
} from "lucide-react";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";

const WEEKDAYS: Array<{
  dayOfWeek: number;
  label: string;
  shortLabel: string;
}> = [
  { dayOfWeek: 0, label: "Domingo", shortLabel: "Dom" },
  { dayOfWeek: 1, label: "Segunda-feira", shortLabel: "Seg" },
  { dayOfWeek: 2, label: "Terça-feira", shortLabel: "Ter" },
  { dayOfWeek: 3, label: "Quarta-feira", shortLabel: "Qua" },
  { dayOfWeek: 4, label: "Quinta-feira", shortLabel: "Qui" },
  { dayOfWeek: 5, label: "Sexta-feira", shortLabel: "Sex" },
  { dayOfWeek: 6, label: "Sábado", shortLabel: "Sáb" },
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Erro ao carregar perfil.</p>
          <Button
            variant="ghost"
            className="mt-4 text-amber-500"
            onClick={() => router.push(`/${locale}/dashboard`)}
          >
            Voltar ao Dashboard
          </Button>
        </div>
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
          startTime: d.isOpen ? (d.startTime ?? DEFAULT_OPEN_START_TIME) : null,
          endTime: d.isOpen ? (d.endTime ?? DEFAULT_OPEN_END_TIME) : null,
          breakStart: d.breakStart,
          breakEnd: d.breakEnd,
        })),
      });
      toast.success("Horários salvos com sucesso!");
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
      toast.success("Fechamento cadastrado com sucesso!");
      setClosureReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao cadastrar fechamento",
      );
    }
  };

  // Calculate stats
  const openDaysCount = draft.filter((d) => d.isOpen).length;
  const totalWorkingHours = draft.reduce((acc, d) => {
    if (!d.isOpen || !d.startTime || !d.endTime) return acc;
    const [sh, sm] = d.startTime.split(":").map(Number);
    const [eh, em] = d.endTime.split(":").map(Number);
    const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    // Subtract break time if exists
    if (d.breakStart && d.breakEnd) {
      const [bsh, bsm] = d.breakStart.split(":").map(Number);
      const [beh, bem] = d.breakEnd.split(":").map(Number);
      const breakHours = (beh * 60 + bem - (bsh * 60 + bsm)) / 60;
      return acc + hours - breakHours;
    }
    return acc + hours;
  }, 0);

  const inputClassName =
    "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 h-10";
  const labelClassName = "text-zinc-400 text-xs font-medium";

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only lg:not-sr-only">Voltar</span>
            </Link>

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
          </div>

          {/* Center - Title */}
          <div className="flex items-center gap-2 lg:flex-1 lg:justify-center">
            <CalendarOff className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg lg:text-xl font-bold">
              Horários da Barbearia
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Save Button - Desktop */}
            <Button
              onClick={handleSaveHours}
              disabled={updateHours.isPending || hoursLoading || !initialized}
              className="hidden lg:flex bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold"
            >
              {updateHours.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Horários
                </>
              )}
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
            Gerenciar Horários de Funcionamento
          </h2>
          <p className="text-zinc-400 mt-1">
            Configure os horários padrão da barbearia e exceções de fechamento
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Summary & Actions (Desktop) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            {/* Summary Card */}
            <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50 sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Resumo da Semana
              </h3>

              {/* Visual Week */}
              <div className="flex gap-1 mb-4">
                {WEEKDAYS.map(({ dayOfWeek, shortLabel }) => {
                  const d = draft.find((x) => x.dayOfWeek === dayOfWeek);
                  return (
                    <div
                      key={dayOfWeek}
                      className={cn(
                        "flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
                        d?.isOpen
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700/50",
                      )}
                      title={d?.isOpen ? "Aberto" : "Fechado"}
                    >
                      {shortLabel}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Dias abertos</span>
                  <span className="font-bold text-emerald-400">
                    {openDaysCount}/7
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Horas/semana</span>
                  <span className="font-bold text-amber-500">
                    ~{totalWorkingHours.toFixed(0)}h
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Fechamentos</span>
                  <span className="font-bold text-zinc-300">
                    {closures.length}
                  </span>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-6 pt-6 border-t border-zinc-700/50 space-y-2">
                <Link
                  href={`/${locale}/admin/barbeiros`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  <Users className="h-4 w-4 text-amber-500" />
                  Horários dos Barbeiros
                </Link>
                <Link
                  href={`/${locale}/admin/barbearia/configuracoes`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Configurações Gerais
                </Link>
              </div>

              {/* Info Card */}
              <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-700/50">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-400">
                    Os horários individuais de cada barbeiro podem sobrescrever
                    esses horários padrão.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Forms */}
          <div className="lg:col-span-9 space-y-6">
            {/* Mobile Banner for Barber Hours */}
            <div className="lg:hidden bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">Horários individuais</h3>
                <p className="text-xs text-zinc-500">Configure por barbeiro</p>
              </div>
              <Link href={`/${locale}/admin/barbeiros`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Ver
                </Button>
              </Link>
            </div>

            {/* Working Hours Card */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Horário Padrão</h2>
                    <p className="text-xs text-zinc-500">
                      Configure por dia da semana
                    </p>
                  </div>
                </div>
                {/* Mobile Save Button */}
                <Button
                  onClick={handleSaveHours}
                  disabled={
                    updateHours.isPending || hoursLoading || !initialized
                  }
                  size="sm"
                  className="lg:hidden bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                >
                  {updateHours.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {hoursLoading || !initialized ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {WEEKDAYS.map(({ dayOfWeek, label, shortLabel }) => {
                    const d = draft.find((x) => x.dayOfWeek === dayOfWeek);
                    if (!d) return null;

                    return (
                      <div
                        key={dayOfWeek}
                        className={cn(
                          "rounded-xl border p-4 transition-all",
                          d.isOpen
                            ? "bg-zinc-800/30 border-zinc-700/50"
                            : "bg-zinc-900/50 border-zinc-800/50",
                        )}
                      >
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold",
                                d.isOpen
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-zinc-800 text-zinc-500",
                              )}
                            >
                              {shortLabel}
                            </div>
                            <span className="font-medium text-sm">{label}</span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
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
                                          d.startTime ??
                                          DEFAULT_OPEN_START_TIME,
                                        endTime:
                                          d.endTime ?? DEFAULT_OPEN_END_TIME,
                                      }
                                    : {}),
                                });
                              }}
                              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                            />
                            <span
                              className={cn(
                                "text-xs font-medium",
                                d.isOpen ? "text-emerald-400" : "text-zinc-500",
                              )}
                            >
                              {d.isOpen ? "Aberto" : "Fechado"}
                            </span>
                          </label>
                        </div>

                        {/* Time Inputs */}
                        <div
                          className={cn(
                            "space-y-3 transition-opacity",
                            !d.isOpen && "opacity-40 pointer-events-none",
                          )}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className={labelClassName}>Início</Label>
                              <Input
                                type="time"
                                value={d.startTime ?? DEFAULT_OPEN_START_TIME}
                                disabled={!d.isOpen}
                                onChange={(e) =>
                                  updateDay(dayOfWeek, {
                                    startTime: e.target.value,
                                  })
                                }
                                className={inputClassName}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className={labelClassName}>Fim</Label>
                              <Input
                                type="time"
                                value={d.endTime ?? DEFAULT_OPEN_END_TIME}
                                disabled={!d.isOpen}
                                onChange={(e) =>
                                  updateDay(dayOfWeek, {
                                    endTime: e.target.value,
                                  })
                                }
                                className={inputClassName}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className={labelClassName}>
                                Intervalo (início)
                              </Label>
                              <Input
                                type="time"
                                value={d.breakStart ?? ""}
                                disabled={!d.isOpen}
                                onChange={(e) =>
                                  updateDay(dayOfWeek, {
                                    breakStart: e.target.value || null,
                                  })
                                }
                                className={inputClassName}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className={labelClassName}>
                                Intervalo (fim)
                              </Label>
                              <Input
                                type="time"
                                value={d.breakEnd ?? ""}
                                disabled={!d.isOpen}
                                onChange={(e) =>
                                  updateDay(dayOfWeek, {
                                    breakEnd: e.target.value || null,
                                  })
                                }
                                className={inputClassName}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Closures Section */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
              {/* New Closure Form */}
              <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <CalendarOff className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Novo Fechamento</h2>
                    <p className="text-xs text-zinc-500">Exceções pontuais</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-sm">Data</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        type="date"
                        value={closureDate}
                        min={startDate}
                        onChange={(e) => setClosureDate(e.target.value)}
                        className={cn(inputClassName, "pl-10")}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closureAllDay}
                      onChange={(e) => setClosureAllDay(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-white">
                        Dia inteiro
                      </span>
                      <p className="text-xs text-zinc-500">
                        Fechado durante todo o dia
                      </p>
                    </div>
                  </label>

                  <div
                    className={cn(
                      "grid grid-cols-2 gap-3 transition-opacity",
                      closureAllDay && "opacity-40 pointer-events-none",
                    )}
                  >
                    <div className="space-y-2">
                      <Label className={labelClassName}>Início</Label>
                      <Input
                        type="time"
                        value={closureStart}
                        disabled={closureAllDay}
                        onChange={(e) => setClosureStart(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelClassName}>Fim</Label>
                      <Input
                        type="time"
                        value={closureEnd}
                        disabled={closureAllDay}
                        onChange={(e) => setClosureEnd(e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-sm">
                      Motivo (opcional)
                    </Label>
                    <Input
                      value={closureReason}
                      placeholder="Ex.: feriado, manutenção..."
                      onChange={(e) => setClosureReason(e.target.value)}
                      className={inputClassName}
                    />
                  </div>

                  <Button
                    onClick={handleCreateClosure}
                    disabled={createClosure.isPending}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold h-11"
                  >
                    {createClosure.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Cadastrar Fechamento
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Closures List */}
              <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      Fechamentos Cadastrados
                    </h2>
                    <p className="text-xs text-zinc-500">Próximos 90 dias</p>
                  </div>
                </div>

                {closuresLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  </div>
                ) : closures.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500/30" />
                    <p className="text-zinc-400">
                      Nenhum fechamento cadastrado
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      A barbearia funcionará normalmente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {closures.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-4 rounded-xl bg-zinc-900/50 border border-zinc-700/50 p-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-red-500/10 flex flex-col items-center justify-center flex-shrink-0">
                            <XCircle className="h-4 w-4 text-red-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm flex items-center gap-2">
                              {formatDateDdMmYyyyFromIsoDateLike(c.date)}
                              <span
                                className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  c.startTime && c.endTime
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-red-500/20 text-red-400",
                                )}
                              >
                                {c.startTime && c.endTime
                                  ? `${c.startTime}–${c.endTime}`
                                  : "Dia inteiro"}
                              </span>
                            </div>
                            {c.reason && (
                              <p className="text-xs text-zinc-500 truncate">
                                {c.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteClosure.mutate(c.id)}
                          disabled={deleteClosure.isPending}
                          className="flex-shrink-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Save Button */}
            <div className="lg:hidden">
              <Button
                onClick={handleSaveHours}
                disabled={updateHours.isPending || hoursLoading || !initialized}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg rounded-xl"
              >
                {updateHours.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
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

      <Toaster
        position="bottom-center"
        theme="dark"
        closeButton
        toastOptions={{
          className:
            "!bg-zinc-900/95 !backdrop-blur-xl !border !border-zinc-700/50 !shadow-2xl !shadow-black/20 !rounded-xl",
          descriptionClassName: "!text-zinc-400",
          style: {
            padding: "16px",
          },
          classNames: {
            success:
              "!border-emerald-500/30 !text-emerald-50 [&>svg]:!text-emerald-400",
            error: "!border-red-500/30 !text-red-50 [&>svg]:!text-red-400",
            warning:
              "!border-amber-500/30 !text-amber-50 [&>svg]:!text-amber-400",
            info: "!border-blue-500/30 !text-blue-50 [&>svg]:!text-blue-400",
          },
        }}
      />
    </div>
  );
}
