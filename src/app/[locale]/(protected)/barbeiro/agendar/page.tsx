"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast, Toaster } from "sonner";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  useServices,
  useSlots,
  useCreateAppointmentByBarber,
} from "@/hooks/useBooking";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  User,
  Phone,
  Scissors,
  Check,
  Menu,
  Info,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateToString, getBrazilDateString } from "@/utils/time-slots";

export default function BarberAgendarPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    getBrazilDateString(),
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Data hooks
  const { data: services, isLoading: servicesLoading } = useServices(
    barberProfile?.id,
  );
  const { data: slots, isLoading: slotsLoading } = useSlots(
    selectedDate,
    barberProfile?.id || null,
    selectedServiceId || null,
  );

  const createAppointment = useCreateAppointmentByBarber();

  // Redirect non-barbers
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

  // Reset time when date or service changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on date/service change
  useEffect(() => {
    setSelectedTime("");
  }, [selectedDate, selectedServiceId]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, "");
    setClientPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServiceId || !selectedDate || !selectedTime) {
      toast.error("Selecione serviço, data e horário");
      return;
    }

    if (!clientName.trim() || clientName.trim().length < 2) {
      toast.error("Nome do cliente deve ter pelo menos 2 caracteres");
      return;
    }

    if (!/^\d{10,11}$/.test(clientPhone)) {
      toast.error("Telefone deve ter 10 ou 11 dígitos");
      return;
    }

    try {
      await createAppointment.mutateAsync({
        serviceId: selectedServiceId,
        date: selectedDate,
        startTime: selectedTime,
        clientName: clientName.trim(),
        clientPhone,
      });

      toast.success("Agendamento criado com sucesso!");

      // Reset form
      setSelectedServiceId("");
      setSelectedTime("");
      setClientName("");
      setClientPhone("");

      // Redirect to barber schedule
      setTimeout(() => {
        router.push(`/${locale}/barbeiro`);
      }, 1500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar agendamento",
      );
    }
  };

  const isLoading = userLoading || barberLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const selectedService = services?.find((s) => s.id === selectedServiceId);
  const availableSlots = slots?.filter((s) => s.available) || [];

  // Generate date options (today + next 30 days)
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return formatDateToString(date);
  });

  const canSubmit =
    selectedServiceId &&
    selectedDate &&
    selectedTime &&
    clientName.trim().length >= 2 &&
    /^\d{10,11}$/.test(clientPhone) &&
    !createAppointment.isPending;

  // Calculate completion steps
  const completedSteps = [
    clientName.trim().length >= 2,
    /^\d{10,11}$/.test(clientPhone),
    !!selectedServiceId,
    !!selectedDate,
    !!selectedTime,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          {/* Back button + Logo (desktop) */}
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/barbeiro`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
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

          {/* Title */}
          <div className="flex items-center gap-2 lg:flex-1 lg:justify-center">
            <Scissors className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg lg:text-xl font-bold">
              Agendar para Cliente
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Quick Links */}
            <Link href={`/${locale}/barbeiro`} className="hidden lg:block">
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Minha Agenda
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Page Title - Desktop */}
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">Novo Agendamento para Cliente</h2>
          <p className="text-zinc-400 mt-1">
            Crie um agendamento para um cliente presencial ou por telefone
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Info & Service - Side by side on desktop */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
                {/* Client Info */}
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Dados do Cliente
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Informações do cliente
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName" className="text-zinc-300">
                        Nome do Cliente
                      </Label>
                      <Input
                        id="clientName"
                        placeholder="Nome completo"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone" className="text-zinc-300">
                        Telefone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                          id="clientPhone"
                          placeholder="11999999999"
                          value={clientPhone}
                          onChange={handlePhoneChange}
                          className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 h-11"
                          maxLength={11}
                          required
                        />
                      </div>
                      <p className="text-xs text-zinc-500">
                        Apenas números, com DDD (10 ou 11 dígitos)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Selection */}
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Scissors className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Serviço</h2>
                      <p className="text-xs text-zinc-500">Escolha o serviço</p>
                    </div>
                  </div>
                  <Select
                    value={selectedServiceId}
                    onValueChange={setSelectedServiceId}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-11">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {servicesLoading ? (
                        <div className="p-2 text-center text-zinc-400">
                          Carregando...
                        </div>
                      ) : (
                        services?.map((service) => (
                          <SelectItem
                            key={service.id}
                            value={service.id}
                            className="text-white focus:bg-zinc-800 focus:text-white"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{service.name}</span>
                              <span className="text-zinc-400 ml-2">
                                {service.duration}min - R${" "}
                                {service.price.toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {/* Service Preview */}
                  {selectedService && (
                    <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {selectedService.name}
                        </span>
                        <span className="text-sm font-bold text-amber-500">
                          R${" "}
                          {selectedService.price.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Clock className="h-3 w-3" />
                        <span>Duração: {selectedService.duration} min</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Time - Side by side on desktop */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
                {/* Date Selection */}
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Data</h2>
                      <p className="text-xs text-zinc-500">Escolha a data</p>
                    </div>
                  </div>
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white h-11">
                      <SelectValue placeholder="Selecione uma data" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                      {dateOptions.map((date) => {
                        const [year, month, day] = date.split("-");
                        const displayDate = `${day}/${month}/${year}`;
                        const dateObj = new Date(
                          Number(year),
                          Number(month) - 1,
                          Number(day),
                        );
                        const weekday = dateObj.toLocaleDateString("pt-BR", {
                          weekday: "long",
                        });
                        const isToday = date === getBrazilDateString();
                        return (
                          <SelectItem
                            key={date}
                            value={date}
                            className="text-white focus:bg-zinc-800 focus:text-white"
                          >
                            <div className="flex items-center gap-2">
                              <span>{displayDate}</span>
                              <span className="text-zinc-500 capitalize">
                                {weekday}
                              </span>
                              {isToday && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                  Hoje
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Selection */}
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Horário</h2>
                      <p className="text-xs text-zinc-500">
                        {selectedService
                          ? `Duração: ${selectedService.duration} min`
                          : "Selecione um serviço primeiro"}
                      </p>
                    </div>
                  </div>

                  {!selectedServiceId ? (
                    <div className="text-center py-6 text-zinc-500">
                      <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        Selecione um serviço para ver os horários
                      </p>
                    </div>
                  ) : slotsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6 text-zinc-400">
                      <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum horário disponível</p>
                      <p className="text-xs mt-1 text-zinc-500">
                        Tente outra data
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedTime(slot.time)}
                          className={cn(
                            "px-2 py-2 rounded-lg text-sm font-medium transition-colors",
                            selectedTime === slot.time
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                              : "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 border border-zinc-600/50",
                          )}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Submit Button */}
              <div className="lg:hidden">
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg rounded-xl"
                  size="lg"
                  disabled={!canSubmit}
                >
                  {createAppointment.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Criando agendamento...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Confirmar Agendamento
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column - Summary (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            {/* Progress Card */}
            <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Progresso</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                      clientName.trim().length >= 2
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-700 text-zinc-400",
                    )}
                  >
                    {clientName.trim().length >= 2 ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      "1"
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      clientName.trim().length >= 2
                        ? "text-white"
                        : "text-zinc-500",
                    )}
                  >
                    Nome do cliente
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                      /^\d{10,11}$/.test(clientPhone)
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-700 text-zinc-400",
                    )}
                  >
                    {/^\d{10,11}$/.test(clientPhone) ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      "2"
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      /^\d{10,11}$/.test(clientPhone)
                        ? "text-white"
                        : "text-zinc-500",
                    )}
                  >
                    Telefone válido
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                      selectedServiceId
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-700 text-zinc-400",
                    )}
                  >
                    {selectedServiceId ? <Check className="h-3 w-3" /> : "3"}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      selectedServiceId ? "text-white" : "text-zinc-500",
                    )}
                  >
                    Serviço selecionado
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                      selectedDate
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-700 text-zinc-400",
                    )}
                  >
                    {selectedDate ? <Check className="h-3 w-3" /> : "4"}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      selectedDate ? "text-white" : "text-zinc-500",
                    )}
                  >
                    Data selecionada
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                      selectedTime
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-700 text-zinc-400",
                    )}
                  >
                    {selectedTime ? <Check className="h-3 w-3" /> : "5"}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      selectedTime ? "text-white" : "text-zinc-500",
                    )}
                  >
                    Horário selecionado
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-700/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Progresso</span>
                  <span className="font-bold text-amber-500">
                    {completedSteps}/5
                  </span>
                </div>
                <div className="mt-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
                    style={{ width: `${(completedSteps / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Summary Card */}
            {selectedService && selectedTime && (
              <div className="bg-zinc-800/50 rounded-2xl p-6 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold">Resumo</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Cliente:</span>
                    <span className="font-medium text-white truncate ml-2 max-w-[140px]">
                      {clientName || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Telefone:</span>
                    <span className="font-medium text-white">
                      {clientPhone || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Serviço:</span>
                    <span className="font-medium text-white">
                      {selectedService.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Data:</span>
                    <span className="font-medium text-white">
                      {selectedDate.split("-").reverse().join("/")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Horário:</span>
                    <span className="font-medium text-white">
                      {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Duração:</span>
                    <span className="font-medium text-white">
                      {selectedService.duration} min
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-zinc-700">
                    <span className="text-zinc-400">Valor:</span>
                    <span className="font-bold text-xl text-amber-500">
                      R$ {selectedService.price.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button - Desktop Sticky */}
            <div className="sticky top-24">
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg rounded-xl"
                size="lg"
                disabled={!canSubmit}
              >
                {createAppointment.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>

              {/* Info Card */}
              <div className="mt-4 bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-400">
                    O agendamento será criado diretamente na sua agenda. O
                    cliente receberá confirmação por telefone se cadastrado.
                  </p>
                </div>
              </div>
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
