"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Search, Calendar } from "lucide-react";
import {
  useGuestAppointments,
  useCancelGuestAppointment,
} from "@/hooks/useBooking";
import { AppointmentCard } from "./AppointmentCard";
import { SignupIncentiveBanner } from "./SignupIncentiveBanner";
import { toast } from "sonner";
import Link from "next/link";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import type { AppointmentWithDetails } from "@/types/booking";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

interface GuestAppointmentsLookupProps {
  initialPhone?: string;
  locale: string;
}

export function GuestAppointmentsLookup({
  initialPhone,
  locale,
}: GuestAppointmentsLookupProps) {
  const [phoneInput, setPhoneInput] = useState(
    initialPhone ? formatPhone(initialPhone) : "",
  );
  const [searchPhone, setSearchPhone] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Auto-search when initialPhone is provided
  useEffect(() => {
    if (initialPhone) {
      const digits = getPhoneDigits(initialPhone);
      if (digits.length >= 10) {
        setSearchPhone(digits);
      }
    }
  }, [initialPhone]);

  const {
    data: appointments,
    isLoading,
    error,
  } = useGuestAppointments(searchPhone);
  const cancelMutation = useCancelGuestAppointment();

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      setPhoneInput(formatted);
    },
    [],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = getPhoneDigits(phoneInput);
    if (digits.length >= 10) {
      setSearchPhone(digits);
    } else {
      toast.error("Informe um telefone válido com DDD");
    }
  };

  const handleCancel = async (appointmentId: string) => {
    if (!searchPhone) return;

    const appointment = appointments?.find((apt) => apt.id === appointmentId);
    if (appointment) {
      const minutesUntil = getMinutesUntilAppointment(
        appointment.date,
        appointment.startTime,
      );

      if (minutesUntil > 0 && minutesUntil < 120) {
        toast("Atenção", {
          description:
            "Você está cancelando com menos de 2 horas de antecedência. O horário será liberado, mas pode ser mais difícil de preencher.",
        });
      }
    }

    setCancellingId(appointmentId);
    try {
      await cancelMutation.mutateAsync({ appointmentId, phone: searchPhone });
      toast.success("Agendamento cancelado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar");
    } finally {
      setCancellingId(null);
    }
  };

  const isPastOrStarted = (apt: AppointmentWithDetails) =>
    getMinutesUntilAppointment(apt.date, apt.startTime) <= 0;

  const confirmedAppointments =
    appointments?.filter(
      (apt) => apt.status === "CONFIRMED" && !isPastOrStarted(apt),
    ) || [];
  const otherAppointments =
    appointments?.filter(
      (apt) => apt.status !== "CONFIRMED" || isPastOrStarted(apt),
    ) || [];

  return (
    <div className="space-y-6">
      {/* Phone Input Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Telefone (WhatsApp)
          </Label>
          <div className="flex gap-2">
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phoneInput}
              onChange={handlePhoneChange}
              className="flex-1"
              autoComplete="tel"
            />
            <Button type="submit" disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Informe o telefone usado no agendamento
          </p>
        </div>
      </form>

      {/* Results */}
      {searchPhone && !isLoading && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center">
              Erro ao buscar agendamentos. Tente novamente.
            </div>
          )}

          {appointments && appointments.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="p-4 bg-muted rounded-full w-fit mx-auto">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Nenhum agendamento encontrado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Não encontramos agendamentos futuros para este telefone.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/${locale}/agendar`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Fazer novo agendamento
                </Link>
              </Button>
            </div>
          )}

          {confirmedAppointments.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">
                Agendamentos Confirmados ({confirmedAppointments.length})
              </h2>
              <div className="space-y-4">
                {confirmedAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onCancel={() => handleCancel(appointment.id)}
                    isCancelling={cancellingId === appointment.id}
                    canCancel
                  />
                ))}
              </div>
            </div>
          )}

          {otherAppointments.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg text-muted-foreground">
                Histórico ({otherAppointments.length})
              </h2>
              <div className="space-y-4">
                {otherAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                  />
                ))}
              </div>
            </div>
          )}

          {appointments && appointments.length > 0 && (
            <div className="pt-4 space-y-4">
              <SignupIncentiveBanner locale={locale} />
              <Button asChild variant="outline" className="w-full">
                <Link href={`/${locale}/agendar`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Fazer novo agendamento
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Initial state - no search yet */}
      {!searchPhone && (
        <div className="text-center py-8 space-y-4">
          <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Consulte seus agendamentos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Informe seu telefone para ver e gerenciar seus agendamentos
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
