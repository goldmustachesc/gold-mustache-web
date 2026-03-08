"use client";

import { useState, useEffect, useDeferredValue, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  useServices,
  useSlots,
  useCreateAppointmentByBarber,
} from "@/hooks/useBooking";
import { useBarberClients, type ClientData } from "@/hooks/useBarberClients";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import {
  Calendar,
  Clock,
  Loader2,
  User,
  Scissors,
  Check,
  Info,
  CheckCircle2,
  Receipt,
  UserCheck,
  UserPlus,
  X,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateToString, getBrazilDateString } from "@/utils/time-slots";

function isValidDateParam(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function isValidTimeParam(value: string | null): value is string {
  return Boolean(value && /^\d{2}:\d{2}$/.test(value));
}

export default function BarberAgendarPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const prefilledDate = searchParams.get("date");
  const prefilledTime = searchParams.get("time");
  const initialSelectedDate = isValidDateParam(prefilledDate)
    ? prefilledDate
    : getBrazilDateString();
  const initialSelectedTime = isValidTimeParam(prefilledTime)
    ? prefilledTime
    : "";

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate);
  const [selectedTime, setSelectedTime] = useState<string>(initialSelectedTime);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const hasMounted = useRef(false);

  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const deferredPhone = useDeferredValue(clientPhone);

  const { data: services, isLoading: servicesLoading } = useServices(
    barberProfile?.id,
  );
  const { data: slots, isLoading: slotsLoading } = useSlots(
    selectedDate,
    barberProfile?.id || null,
    selectedServiceId || null,
  );

  const shouldSearch = deferredPhone.length >= 6 && !selectedClient;
  const { data: clientsResponse, isLoading: clientsLoading } = useBarberClients(
    shouldSearch ? deferredPhone : undefined,
  );
  const clientSuggestions = clientsResponse?.data ?? [];

  const createAppointment = useCreateAppointmentByBarber();

  usePrivateHeader({
    title: "Agendar para Cliente",
    icon: UserPlus,
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on date/service change
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setSelectedTime("");
  }, [selectedDate, selectedServiceId]);

  useEffect(() => {
    if (clientSuggestions.length > 0 && !selectedClient) {
      setShowSuggestions(true);
    }
  }, [clientSuggestions, selectedClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        phoneInputRef.current &&
        !phoneInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatPhoneDisplay = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
    setClientPhone(value);
    if (selectedClient) {
      setSelectedClient(null);
      setClientName("");
    }
  };

  const handleSelectClient = (client: ClientData) => {
    setSelectedClient(client);
    setClientName(client.fullName);
    setClientPhone(client.phone);
    setShowSuggestions(false);
  };

  const handleClearSelection = () => {
    setSelectedClient(null);
    setClientName("");
    setClientPhone("");
    setShowSuggestions(false);
    phoneInputRef.current?.focus();
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

      setSelectedServiceId("");
      setSelectedTime("");
      setClientName("");
      setClientPhone("");
      setSelectedClient(null);

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedService = services?.find((s) => s.id === selectedServiceId);
  const availableSlots = slots?.filter((s) => s.available) || [];

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

  const completedSteps = [
    clientName.trim().length >= 2,
    /^\d{10,11}$/.test(clientPhone),
    !!selectedServiceId,
    !!selectedDate,
    !!selectedTime,
  ].filter(Boolean).length;

  return (
    <div>
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">Novo Agendamento para Cliente</h2>
          <p className="text-muted-foreground mt-1">
            Crie um agendamento para um cliente presencial ou por telefone
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
                <div
                  className={cn(
                    "bg-muted/50 rounded-2xl p-6 border",
                    selectedClient ? "border-emerald-500/30" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center",
                          selectedClient
                            ? "bg-emerald-500/10"
                            : "bg-primary/10",
                        )}
                      >
                        {selectedClient ? (
                          <UserCheck className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">
                          Dados do Cliente
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {selectedClient
                            ? "Cliente selecionado"
                            : "Digite o telefone para buscar"}
                        </p>
                      </div>
                    </div>
                    {selectedClient && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>

                  {selectedClient && (
                    <div className="mb-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm text-emerald-400 font-medium">
                          Cliente cadastrado
                        </span>
                        {selectedClient.type === "registered" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            Conta ativa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedClient.appointmentCount} agendamento
                        {selectedClient.appointmentCount !== 1 ? "s" : ""}{" "}
                        anterior
                        {selectedClient.appointmentCount !== 1 ? "es" : ""}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone" className="text-foreground">
                        Telefone
                      </Label>
                      <div className="relative">
                        {clientsLoading ? (
                          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                        ) : (
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        )}
                        <Input
                          ref={phoneInputRef}
                          id="clientPhone"
                          placeholder="(00) 00000-0000"
                          value={formatPhoneDisplay(clientPhone)}
                          onChange={handlePhoneChange}
                          onFocus={() => {
                            if (
                              clientSuggestions.length > 0 &&
                              !selectedClient
                            ) {
                              setShowSuggestions(true);
                            }
                          }}
                          className={cn(
                            "pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground h-11",
                            selectedClient
                              ? "border-emerald-500/50 focus:border-emerald-500"
                              : "focus:border-primary",
                          )}
                          maxLength={16}
                          required
                          readOnly={!!selectedClient}
                        />

                        {showSuggestions && clientSuggestions.length > 0 && (
                          <div
                            ref={suggestionsRef}
                            className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
                          >
                            <div className="p-2 text-xs text-muted-foreground border-b border-border">
                              <Search className="h-3 w-3 inline mr-1" />
                              {clientSuggestions.length} cliente
                              {clientSuggestions.length !== 1 ? "s" : ""}{" "}
                              encontrado
                              {clientSuggestions.length !== 1 ? "s" : ""}
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {clientSuggestions.map((client) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => handleSelectClient(client)}
                                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-left"
                                >
                                  <div
                                    className={cn(
                                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
                                      client.type === "registered"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-primary/20 text-primary",
                                    )}
                                  >
                                    {client.fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground font-medium truncate">
                                      {client.fullName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {client.phone.length === 11
                                        ? client.phone.replace(
                                            /(\d{2})(\d{5})(\d{4})/,
                                            "($1) $2-$3",
                                          )
                                        : client.phone.replace(
                                            /(\d{2})(\d{4})(\d{4})/,
                                            "($1) $2-$3",
                                          )}
                                    </p>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {client.appointmentCount} agend.
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedClient
                          ? "Cliente selecionado automaticamente"
                          : "Digite o telefone para buscar ou criar novo cliente"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientName" className="text-foreground">
                        Nome do Cliente
                      </Label>
                      <Input
                        id="clientName"
                        placeholder="Nome completo"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                        readOnly={!!selectedClient}
                        className={cn(
                          "bg-background border-border text-foreground placeholder:text-muted-foreground h-11",
                          selectedClient
                            ? "border-emerald-500/50 bg-background/50 cursor-not-allowed"
                            : "focus:border-primary",
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Scissors className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Serviço</h2>
                      <p className="text-xs text-muted-foreground">
                        Escolha o serviço
                      </p>
                    </div>
                  </div>
                  <Select
                    value={selectedServiceId}
                    onValueChange={setSelectedServiceId}
                  >
                    <SelectTrigger className="bg-card border-border text-foreground h-11">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {servicesLoading ? (
                        <div className="p-2 text-center text-muted-foreground">
                          Carregando...
                        </div>
                      ) : (
                        services?.map((service) => (
                          <SelectItem
                            key={service.id}
                            value={service.id}
                            className="text-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{service.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {service.duration}min - R${" "}
                                {service.price.toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {selectedService && (
                    <div className="mt-4 p-4 bg-background/50 rounded-xl border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          {selectedService.name}
                        </span>
                        <span className="text-sm font-bold text-primary">
                          R${" "}
                          {selectedService.price.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Duração: {selectedService.duration} min</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Data</h2>
                      <p className="text-xs text-muted-foreground">
                        Escolha a data
                      </p>
                    </div>
                  </div>
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger className="bg-card border-border text-foreground h-11">
                      <SelectValue placeholder="Selecione uma data" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border max-h-60">
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
                            className="text-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <span>{displayDate}</span>
                              <span className="text-muted-foreground capitalize">
                                {weekday}
                              </span>
                              {isToday && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
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

                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Horário</h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedService
                          ? `Duração: ${selectedService.duration} min`
                          : "Selecione um serviço primeiro"}
                      </p>
                    </div>
                  </div>

                  {!selectedServiceId ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        Selecione um serviço para ver os horários
                      </p>
                    </div>
                  ) : slotsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum horário disponível</p>
                      <p className="text-xs mt-1 text-muted-foreground">
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
                              ? "bg-gradient-to-r from-primary to-primary/80 text-foreground"
                              : "bg-muted/50 text-foreground hover:bg-accent border border-border",
                          )}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:hidden">
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold text-lg rounded-xl"
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

          <div className="hidden lg:block lg:col-span-4 space-y-6">
            <div className="bg-card/30 rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Progresso</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                      clientName.trim().length >= 2
                        ? "bg-emerald-500 text-foreground"
                        : "bg-muted text-muted-foreground",
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
                        ? "text-foreground"
                        : "text-muted-foreground",
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
                        ? "bg-emerald-500 text-foreground"
                        : "bg-muted text-muted-foreground",
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
                        ? "text-foreground"
                        : "text-muted-foreground",
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
                        ? "bg-emerald-500 text-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selectedServiceId ? <Check className="h-3 w-3" /> : "3"}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      selectedServiceId
                        ? "text-foreground"
                        : "text-muted-foreground",
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
                        ? "bg-emerald-500 text-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selectedDate ? <Check className="h-3 w-3" /> : "4"}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      selectedDate
                        ? "text-foreground"
                        : "text-muted-foreground",
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
                        ? "bg-emerald-500 text-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selectedTime ? <Check className="h-3 w-3" /> : "5"}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      selectedTime
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    Horário selecionado
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-bold text-primary">
                    {completedSteps}/5
                  </span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
                    style={{ width: `${(completedSteps / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {selectedService && selectedTime && (
              <div className="bg-muted/50 rounded-2xl p-6 border border-primary/30">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Resumo</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium text-foreground truncate ml-2 max-w-[140px]">
                      {clientName || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium text-foreground">
                      {clientPhone || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serviço:</span>
                    <span className="font-medium text-foreground">
                      {selectedService.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data:</span>
                    <span className="font-medium text-foreground">
                      {selectedDate.split("-").reverse().join("/")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horário:</span>
                    <span className="font-medium text-foreground">
                      {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duração:</span>
                    <span className="font-medium text-foreground">
                      {selectedService.duration} min
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-border">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-bold text-xl text-primary">
                      R$ {selectedService.price.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="sticky top-24">
              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold text-lg rounded-xl"
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

              <div className="mt-4 bg-card/30 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    O agendamento será criado diretamente na sua agenda. O
                    cliente receberá confirmação por telefone se cadastrado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
