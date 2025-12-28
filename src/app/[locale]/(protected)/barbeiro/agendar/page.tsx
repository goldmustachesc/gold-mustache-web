"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  User,
  Phone,
  Scissors,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateToString, getBrazilDateString } from "@/utils/time-slots";

export default function BarberAgendarPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();

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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/${locale}/barbeiro`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Agendar para Cliente</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Dados do Cliente
              </CardTitle>
              <CardDescription>
                Informe os dados do cliente para o agendamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome do Cliente</Label>
                <Input
                  id="clientName"
                  placeholder="Nome completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="clientPhone"
                    placeholder="11999999999"
                    value={clientPhone}
                    onChange={handlePhoneChange}
                    className="pl-10"
                    maxLength={11}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas números, com DDD (10 ou 11 dígitos)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Service Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicesLoading ? (
                    <div className="p-2 text-center text-muted-foreground">
                      Carregando...
                    </div>
                  ) : (
                    services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
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
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma data" />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((date) => {
                    const [year, month, day] = date.split("-");
                    const displayDate = `${day}/${month}/${year}`;
                    const dateObj = new Date(
                      Number(year),
                      Number(month) - 1,
                      Number(day),
                    );
                    const weekday = dateObj.toLocaleDateString("pt-BR", {
                      weekday: "short",
                    });
                    return (
                      <SelectItem key={date} value={date}>
                        {displayDate} ({weekday})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Time Selection */}
          {selectedServiceId && selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Horário
                </CardTitle>
                {selectedService && (
                  <CardDescription>
                    Duração: {selectedService.duration} minutos
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum horário disponível nesta data</p>
                    <p className="text-sm mt-1">
                      Tente selecionar outra data ou verifique suas ausências
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setSelectedTime(slot.time)}
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          selectedTime === slot.time
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80",
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary & Submit */}
          {selectedService && selectedTime && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Resumo do Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{clientName || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefone:</span>
                  <span className="font-medium">{clientPhone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {selectedDate.split("-").reverse().join("/")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">
                    {selectedService.duration} min
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-bold text-lg">
                    R$ {selectedService.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!canSubmit}
          >
            {createAppointment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando agendamento...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirmar Agendamento
              </>
            )}
          </Button>
        </form>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}
