"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceSelector } from "./ServiceSelector";
import { DatePicker } from "./DatePicker";
import { TimeSlotGrid } from "./TimeSlotGrid";
import { BookingConfirmation } from "./BookingConfirmation";
import { BarberSelector } from "./BarberSelector";
import { GuestInfoStep } from "./GuestInfoStep";
import { SignupIncentiveBanner } from "./SignupIncentiveBanner";
import {
  useBarbers,
  useServices,
  useSlots,
  useCreateAppointment,
  useCreateGuestAppointment,
} from "@/hooks/useBooking";
import { useUser } from "@/hooks/useAuth";
import type {
  ServiceData,
  TimeSlot,
  AppointmentWithDetails,
  BarberData,
} from "@/types/booking";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Scissors,
  User,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateToString } from "@/utils/time-slots";

type BookingStep =
  | "barber"
  | "service"
  | "date"
  | "time"
  | "info"
  | "confirmation";

interface BookingPageProps {
  onViewAppointments?: () => void;
}

const BASE_STEPS: {
  key: Exclude<BookingStep, "confirmation">;
  label: string;
  icon: React.ElementType;
  guestOnly?: boolean;
}[] = [
  { key: "barber", label: "Barbeiro", icon: User },
  { key: "service", label: "Serviço", icon: Scissors },
  { key: "date", label: "Data", icon: Calendar },
  { key: "time", label: "Horário", icon: Clock },
  { key: "info", label: "Dados", icon: UserCircle, guestOnly: true },
];

export function BookingPage({ onViewAppointments }: BookingPageProps) {
  const { data: user } = useUser();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";
  const isGuest = !user;

  const [step, setStep] = useState<BookingStep>("barber");
  const [selectedBarber, setSelectedBarber] = useState<BarberData | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<AppointmentWithDetails | null>(null);
  const [guestPhone, setGuestPhone] = useState<string | null>(null);

  const { data: barbers = [], isLoading: barbersLoading } = useBarbers();
  const { data: services = [], isLoading: servicesLoading } = useServices(
    selectedBarber?.id,
  );

  // Use formatDateToString to ensure correct local timezone
  const dateStr = selectedDate ? formatDateToString(selectedDate) : null;
  // Pass serviceId to generate slots based on service duration
  const { data: slots = [], isLoading: slotsLoading } = useSlots(
    dateStr,
    selectedBarber?.id ?? null,
    selectedService?.id ?? null,
  );

  const createAppointment = useCreateAppointment();
  const createGuestAppointment = useCreateGuestAppointment();

  // Filter steps based on whether user is guest
  const STEPS = BASE_STEPS.filter((s) => !s.guestOnly || isGuest);

  const handleBarberSelect = (barber: BarberData) => {
    setSelectedBarber(barber);
    setSelectedService(null);
    setStep("service");
  };

  const handleServiceSelect = (service: ServiceData) => {
    setSelectedService(service);
    setStep("date");
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("time");
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleProceedToConfirm = () => {
    if (isGuest) {
      setStep("info");
    } else {
      handleConfirmLoggedIn();
    }
  };

  const handleConfirmLoggedIn = async () => {
    if (!selectedBarber || !selectedService || !selectedDate || !selectedSlot)
      return;

    try {
      const appointment = await createAppointment.mutateAsync({
        serviceId: selectedService.id,
        barberId: selectedBarber.id,
        date: formatDateToString(selectedDate),
        startTime: selectedSlot.time,
      });

      setConfirmedAppointment(appointment);
      setStep("confirmation");
      toast.success("Agendamento realizado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao agendar");
    }
  };

  const handleConfirmGuest = async (guestData: {
    clientName: string;
    clientPhone: string;
  }) => {
    if (!selectedBarber || !selectedService || !selectedDate || !selectedSlot)
      return;

    try {
      const appointment = await createGuestAppointment.mutateAsync({
        serviceId: selectedService.id,
        barberId: selectedBarber.id,
        date: formatDateToString(selectedDate),
        startTime: selectedSlot.time,
        clientName: guestData.clientName,
        clientPhone: guestData.clientPhone,
      });

      setConfirmedAppointment(appointment);
      setGuestPhone(guestData.clientPhone);
      setStep("confirmation");
      toast.success("Agendamento realizado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao agendar");
    }
  };

  const handleViewGuestAppointments = () => {
    if (guestPhone) {
      router.push(`/${locale}/meus-agendamentos?phone=${guestPhone}`);
    }
  };

  const handleBack = () => {
    if (step === "service") {
      setStep("barber");
    } else if (step === "date") {
      setStep("service");
    } else if (step === "time") {
      setStep("date");
      setSelectedSlot(null);
    } else if (step === "info") {
      setStep("time");
    }
  };

  const handleNewBooking = () => {
    setStep("barber");
    setSelectedBarber(null);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setConfirmedAppointment(null);
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  if (step === "confirmation" && confirmedAppointment) {
    return (
      <div className="space-y-6">
        <BookingConfirmation
          appointment={confirmedAppointment}
          onClose={handleNewBooking}
          onViewAppointments={
            isGuest ? handleViewGuestAppointments : onViewAppointments
          }
        />
        {isGuest && <SignupIncentiveBanner locale={locale} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.key === step;
          const isCompleted = index < currentStepIndex;

          return (
            <div key={s.key} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/20 text-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-6 sm:w-8 h-0.5 mx-1",
                    index < currentStepIndex ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Back Button */}
      {step !== "barber" && (
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {step === "barber" && "Escolha o Barbeiro"}
            {step === "service" && "Escolha o Serviço"}
            {step === "date" && "Escolha a Data"}
            {step === "time" && "Escolha o Horário"}
            {step === "info" && "Seus Dados"}
          </CardTitle>
          <CardDescription>
            {step === "barber" && "Selecione o profissional de sua preferência"}
            {step === "service" && `Com ${selectedBarber?.name}`}
            {step === "date" &&
              `${selectedService?.name} • R$ ${selectedService?.price.toFixed(2).replace(".", ",")}`}
            {step === "time" && selectedDate && (
              <>
                {selectedService?.name} •{" "}
                {selectedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </>
            )}
            {step === "info" &&
              `${selectedSlot?.time} • ${selectedDate?.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "barber" && (
            <BarberSelector
              barbers={barbers}
              selectedBarber={selectedBarber}
              onSelect={handleBarberSelect}
              isLoading={barbersLoading}
            />
          )}

          {step === "service" && (
            <ServiceSelector
              services={services}
              selectedService={selectedService}
              onSelect={handleServiceSelect}
              isLoading={servicesLoading}
            />
          )}

          {step === "date" && (
            <DatePicker
              selectedDate={selectedDate}
              onSelect={handleDateSelect}
            />
          )}

          {step === "time" && (
            <div className="space-y-6">
              <TimeSlotGrid
                slots={slots}
                selectedSlot={selectedSlot}
                onSelect={handleSlotSelect}
                isLoading={slotsLoading}
              />

              {selectedSlot && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Horário selecionado
                      </p>
                      <p className="text-lg font-semibold">
                        {selectedSlot.time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="text-lg font-bold text-primary">
                        R$ {selectedService?.price.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleProceedToConfirm}
                    className="w-full"
                    size="lg"
                    disabled={createAppointment.isPending}
                  >
                    {createAppointment.isPending
                      ? "Agendando..."
                      : isGuest
                        ? "Continuar"
                        : "Confirmar Agendamento"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "info" && (
            <div className="space-y-6">
              <SignupIncentiveBanner variant="compact" locale={locale} />
              <GuestInfoStep
                onSubmit={handleConfirmGuest}
                isLoading={createGuestAppointment.isPending}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
