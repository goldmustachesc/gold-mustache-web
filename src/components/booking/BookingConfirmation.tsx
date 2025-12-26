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
import { Calendar, CheckCircle, Clock, Scissors, User } from "lucide-react";
import { formatDateDdMmYyyyFromIsoDateLike } from "@/utils/datetime";

interface BookingConfirmationProps {
  appointment: AppointmentWithDetails;
  onClose: () => void;
  onViewAppointments?: () => void;
}

export function BookingConfirmation({
  appointment,
  onClose,
  onViewAppointments,
}: BookingConfirmationProps) {
  const formatDate = (dateStr: string) => {
    return formatDateDdMmYyyyFromIsoDateLike(dateStr);
  };

  return (
    <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-xl text-green-700 dark:text-green-400">
          Agendamento Confirmado!
        </CardTitle>
        <CardDescription>
          Seu horário foi reservado com sucesso.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-background rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Scissors className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Serviço</p>
              <p className="font-medium">{appointment.service.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Barbeiro</p>
              <p className="font-medium">{appointment.barber.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-medium">{formatDate(appointment.date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Horário</p>
              <p className="font-medium">
                {appointment.startTime} - {appointment.endTime}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Valor</p>
          <p className="text-2xl font-bold text-primary">
            R$ {appointment.service.price.toFixed(2).replace(".", ",")}
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Você pode cancelar a qualquer momento antes do horário. Se faltar
          menos de 2 horas, vamos apenas exibir um aviso.
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
