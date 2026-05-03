"use client";

import { Button } from "@/components/ui/button";
import { calculateEndTime } from "@/lib/booking/time";
import { cn } from "@/lib/utils";
import type { BarberData, ServiceData, TimeSlot } from "@/types/booking";
import { Clock, Loader2, PencilLine, Scissors } from "lucide-react";

type BookingStep =
  | "greeting"
  | "barber"
  | "service"
  | "date"
  | "time"
  | "profile-update"
  | "info"
  | "review"
  | "confirming"
  | "confirmation";

interface BookingLivePreviewProps {
  barber: BarberData | null;
  service: ServiceData | null;
  date: Date | null;
  slot: TimeSlot | null;
  guestInfo: { clientName: string; clientPhone: string } | null;
  isGuest: boolean;
  step: BookingStep;
  isConfirming: boolean;
  onConfirm: () => void;
  onBackFromReview: () => void;
  onEditCustomerData: () => void;
  className?: string;
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

const slotClass =
  "rounded-xl bg-background/60 px-3 py-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300";

const ghostSlotClass =
  "rounded-xl border border-dashed border-border/60 px-3 py-2.5";

const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

const ghostHintClass = "mt-0.5 text-sm text-muted-foreground/70 italic";

export function BookingLivePreview({
  barber,
  service,
  date,
  slot,
  guestInfo,
  isGuest,
  step,
  isConfirming,
  onConfirm,
  onBackFromReview,
  onEditCustomerData,
  className,
}: BookingLivePreviewProps) {
  const isReview = step === "review";

  const timeRange =
    slot && service
      ? `${slot.time} – ${calculateEndTime(slot.time, service.duration)}`
      : null;

  return (
    <div
      className={cn(
        "flex flex-col flex-1 min-h-0 rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground">
          {isReview ? "Confirme seu agendamento" : "Seu agendamento"}
        </h3>
      </div>

      <div className="flex flex-col flex-1 gap-3 p-4 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:hsl(var(--foreground)/0.25)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-foreground/20">
        {barber ? (
          <div className={slotClass}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 text-sm font-semibold text-primary">
                {barber.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className={labelClass}>Barbeiro</p>
                <p className="mt-0.5 text-sm font-medium text-foreground truncate">
                  {barber.name}
                </p>
              </div>
              <Scissors className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className={ghostSlotClass}>
            <p className={labelClass}>Barbeiro</p>
            <p className={ghostHintClass}>Selecione um barbeiro</p>
          </div>
        )}

        {service ? (
          <div className={slotClass}>
            <p className={labelClass}>Serviço</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {service.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {service.duration} min · R${" "}
              {service.price.toFixed(2).replace(".", ",")}
            </p>
          </div>
        ) : (
          <div className={ghostSlotClass}>
            <p className={labelClass}>Serviço</p>
            <p className={ghostHintClass}>Aguardando escolha</p>
          </div>
        )}

        {date || slot ? (
          <div className={slotClass}>
            <p className={labelClass}>Data e horário</p>
            {date && (
              <p className="mt-0.5 text-sm font-medium text-foreground capitalize">
                {formatLongDate(date)}
              </p>
            )}
            {timeRange && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeRange}
              </p>
            )}
          </div>
        ) : (
          <div className={ghostSlotClass}>
            <p className={labelClass}>Data e horário</p>
            <p className={ghostHintClass}>A definir</p>
          </div>
        )}

        {isReview && (
          <div className={slotClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className={labelClass}>Cliente</p>
                {isGuest && guestInfo ? (
                  <>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {guestInfo.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPhoneDisplay(guestInfo.clientPhone)}
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    Cadastro pronto para confirmar.
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={onEditCustomerData}
                disabled={isConfirming}
                aria-label="Editar dados"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Editar dados
              </Button>
            </div>
          </div>
        )}
      </div>

      {isReview && (
        <div className="px-4 py-4 border-t border-border flex flex-col gap-2 shrink-0">
          <Button
            onClick={onConfirm}
            disabled={isConfirming}
            className="w-full shadow-md"
            aria-busy={isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirmando...
              </>
            ) : (
              "Confirmar agendamento"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onBackFromReview}
            disabled={isConfirming}
            className="w-full border-zinc-300 hover:bg-zinc-200/50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Voltar e editar
          </Button>
        </div>
      )}
    </div>
  );
}
