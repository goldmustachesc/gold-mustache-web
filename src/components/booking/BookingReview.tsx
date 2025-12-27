"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { BarberData, ServiceData, TimeSlot } from "@/types/booking";
import {
  Calendar,
  Clock,
  Scissors,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatDateDdMmYyyyInSaoPaulo } from "@/utils/datetime";

interface BookingReviewProps {
  barber: BarberData;
  service: ServiceData;
  date: Date;
  slot: TimeSlot;
  guestInfo?: {
    clientName: string;
    clientPhone: string;
  };
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function BookingReview({
  barber,
  service,
  date,
  slot,
  guestInfo,
  onConfirm,
  onBack,
  isLoading,
}: BookingReviewProps) {
  const formattedDate = formatDateDdMmYyyyInSaoPaulo(date);

  // Calculate end time based on service duration
  const [hours, minutes] = slot.time.split(":").map(Number);
  const endMinutes = hours * 60 + minutes + service.duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold">Confirme seu Agendamento</h2>
        <p className="text-sm text-muted-foreground">
          Verifique se todos os dados estão corretos antes de confirmar
        </p>
      </div>

      {/* Review Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo do Agendamento</CardTitle>
          <CardDescription>
            Revise os detalhes abaixo com atenção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barber */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Barbeiro</p>
              <p className="font-semibold">{barber.name}</p>
            </div>
          </div>

          <Separator />

          {/* Service */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Scissors className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Serviço</p>
              <p className="font-semibold">{service.name}</p>
              <p className="text-sm text-muted-foreground">
                Duração: {service.duration} minutos
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary text-lg">
                R$ {service.price.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>

          <Separator />

          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-semibold">{formattedDate}</p>
            </div>
          </div>

          <Separator />

          {/* Time */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Horário</p>
              <p className="font-semibold">
                {slot.time} - {endTime}
              </p>
            </div>
          </div>

          {/* Guest Info */}
          {guestInfo && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{guestInfo.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {guestInfo.clientPhone}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={onConfirm}
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Confirmando...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirmar Agendamento
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full"
          disabled={isLoading}
        >
          Voltar e Editar
        </Button>
      </div>

      {/* Warning */}
      <p className="text-xs text-center text-muted-foreground">
        Ao confirmar, você concorda com as políticas de cancelamento da
        barbearia
      </p>
    </div>
  );
}
