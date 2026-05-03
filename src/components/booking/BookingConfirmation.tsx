"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppointmentWithDetails } from "@/types/booking";
import { formatLocalizedDateFromIsoDateLike } from "@/utils/datetime";
import { formatPrice } from "@/utils/format";
import { Calendar, CheckCircle, Clock, Scissors, User } from "lucide-react";
import Image from "next/image";

interface BookingConfirmationProps {
  appointment: AppointmentWithDetails;
  onClose: () => void;
  onViewAppointments?: () => void;
}

function formatDate(dateStr: string): string {
  return formatLocalizedDateFromIsoDateLike(dateStr, "pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function BookingConfirmation({
  appointment,
  onClose,
  onViewAppointments,
}: BookingConfirmationProps) {
  return (
    <Card className="border-success/30 bg-success/10">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 p-3 bg-success/15 rounded-full w-16 h-16 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <CardTitle className="text-xl text-success">
          Agendamento confirmado
        </CardTitle>
        <CardDescription>
          Seu horário foi reservado com sucesso.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-background rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Scissors className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Serviço</p>
              <p className="font-medium">{appointment.service.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {appointment.barber.avatarUrl ? (
              <Image
                src={appointment.barber.avatarUrl}
                alt={appointment.barber.name}
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover shrink-0"
              />
            ) : (
              <User className="h-5 w-5 text-primary shrink-0" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Barbeiro</p>
              <p className="font-medium">{appointment.barber.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="font-medium capitalize">
                {formatDate(appointment.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Horário</p>
              <p className="font-medium">
                {appointment.startTime} – {appointment.endTime}
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Valor</p>
            <p className="text-xl font-bold text-primary">
              {formatPrice(appointment.service.price)}
            </p>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground px-2">
          Cancelamento permitido até 2 horas antes do horário agendado.
        </p>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {onViewAppointments && (
          <Button onClick={onViewAppointments} className="w-full">
            Ver Meus Agendamentos
          </Button>
        )}
        <Button onClick={onClose} variant="outline" className="w-full">
          Fazer Novo Agendamento
        </Button>
      </CardFooter>
    </Card>
  );
}
