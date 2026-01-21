"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppointmentWithDetails } from "@/types/booking";
import {
  ArrowLeft,
  Bell,
  BarChart3,
  Pencil,
  Loader2,
  X,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getMinutesUntilAppointment } from "@/utils/time-slots";

interface AppointmentDetailSheetProps {
  appointment: AppointmentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelAppointment?: (id: string, reason: string) => void;
  isCancelling?: boolean;
  onMarkNoShow?: (id: string) => void;
  isMarkingNoShow?: boolean;
  onViewClientHistory?: (
    clientId: string,
    clientType: "registered" | "guest",
  ) => void;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>WhatsApp</title>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

function formatDateLong(dateStr: string): string {
  // dateStr format: "2026-01-21"
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString("pt-BR", { month: "short" });
  const yearNum = date.getFullYear();

  // Capitaliza primeira letra
  const weekdayFormatted =
    weekday.charAt(0).toUpperCase() + weekday.slice(1).replace(".", "");

  return `${weekdayFormatted}, ${dayNum} de ${monthName} de ${yearNum}`;
}

// Barcode visual decorativo - barras pré-geradas para evitar re-render com valores diferentes
const BARCODE_BARS = [
  { id: "a1", w: 2, h: 28 },
  { id: "a2", w: 1, h: 35 },
  { id: "a3", w: 2, h: 22 },
  { id: "a4", w: 1, h: 38 },
  { id: "b1", w: 2, h: 25 },
  { id: "b2", w: 1, h: 32 },
  { id: "b3", w: 2, h: 40 },
  { id: "b4", w: 1, h: 24 },
  { id: "c1", w: 2, h: 36 },
  { id: "c2", w: 1, h: 29 },
  { id: "c3", w: 2, h: 33 },
  { id: "c4", w: 1, h: 26 },
  { id: "d1", w: 2, h: 38 },
  { id: "d2", w: 1, h: 21 },
  { id: "d3", w: 2, h: 34 },
  { id: "d4", w: 1, h: 30 },
  { id: "e1", w: 2, h: 27 },
  { id: "e2", w: 1, h: 39 },
  { id: "e3", w: 2, h: 23 },
  { id: "e4", w: 1, h: 31 },
  { id: "f1", w: 2, h: 37 },
  { id: "f2", w: 1, h: 28 },
  { id: "f3", w: 2, h: 35 },
  { id: "f4", w: 1, h: 22 },
  { id: "g1", w: 2, h: 33 },
  { id: "g2", w: 1, h: 26 },
  { id: "g3", w: 2, h: 40 },
  { id: "g4", w: 1, h: 24 },
  { id: "h1", w: 2, h: 29 },
  { id: "h2", w: 1, h: 36 },
  { id: "h3", w: 2, h: 21 },
  { id: "h4", w: 1, h: 38 },
  { id: "i1", w: 2, h: 25 },
  { id: "i2", w: 1, h: 32 },
  { id: "i3", w: 2, h: 34 },
  { id: "i4", w: 1, h: 27 },
  { id: "j1", w: 2, h: 39 },
  { id: "j2", w: 1, h: 23 },
  { id: "j3", w: 2, h: 30 },
  { id: "j4", w: 1, h: 35 },
];

function BarcodeDecoration({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-[2px] h-10">
        {/* Simulação de código de barras */}
        {BARCODE_BARS.map((bar) => (
          <div
            key={bar.id}
            className="bg-zinc-400 dark:bg-zinc-500"
            style={{
              width: `${bar.w}px`,
              height: `${bar.h}px`,
            }}
          />
        ))}
      </div>
      <span className="text-xs font-mono text-zinc-500">{code}</span>
    </div>
  );
}

export function AppointmentDetailSheet({
  appointment,
  open,
  onOpenChange,
  onCancelAppointment,
  isCancelling = false,
  onMarkNoShow,
  isMarkingNoShow = false,
  onViewClientHistory,
}: AppointmentDetailSheetProps) {
  const [sendingReminder, setSendingReminder] = useState(false);

  if (!appointment) return null;

  const clientName =
    appointment.client?.fullName ||
    appointment.guestClient?.fullName ||
    "Cliente";
  const clientPhone =
    appointment.client?.phone || appointment.guestClient?.phone || "";
  const clientId = appointment.client?.id || appointment.guestClient?.id || "";
  const clientType = appointment.client ? "registered" : "guest";

  const isConfirmed = appointment.status === "CONFIRMED";
  const isNoShow = appointment.status === "NO_SHOW";
  const isCancelled =
    appointment.status === "CANCELLED_BY_CLIENT" ||
    appointment.status === "CANCELLED_BY_BARBER";

  const minutesUntil = getMinutesUntilAppointment(
    appointment.date,
    appointment.startTime,
  );
  const isPast = minutesUntil <= 0;
  const canCancel = isConfirmed && !isPast;
  const canMarkNoShow = isConfirmed && isPast && !!onMarkNoShow;

  // Gera código do ticket baseado no ID
  const ticketCode = `${appointment.date.replace(/-/g, "")} ${appointment.startTime.replace(":", "")} ${appointment.id.slice(-4).toUpperCase()}`;

  const handleWhatsApp = () => {
    if (!clientPhone) return;
    const digits = clientPhone.replace(/\D/g, "");
    const phoneWithCountry = digits.startsWith("55") ? digits : `55${digits}`;
    window.open(`https://wa.me/${phoneWithCountry}`, "_blank");
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(
        `${baseUrl}/api/appointments/${appointment.id}/reminder`,
        { method: "POST" },
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Erro ao enviar lembrete");
        return;
      }

      if (data.type === "notification_and_whatsapp" && data.whatsappUrl) {
        toast.success("Notificação enviada! Abrindo WhatsApp...");
        window.open(data.whatsappUrl, "_blank");
      } else if (data.type === "whatsapp" && data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
        toast.success("WhatsApp aberto com mensagem de lembrete");
      } else if (data.type === "notification") {
        toast.success("Lembrete enviado para o cliente!");
      }
    } catch {
      toast.error("Erro ao enviar lembrete");
    } finally {
      setSendingReminder(false);
    }
  };

  const handleCancel = () => {
    const reason = prompt("Motivo do cancelamento:");
    if (reason && onCancelAppointment) {
      onCancelAppointment(appointment.id, reason);
    }
  };

  const handleMarkNoShow = () => {
    if (onMarkNoShow) {
      onMarkNoShow(appointment.id);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "h-auto max-h-[90vh] rounded-t-3xl",
          "bg-card border-t border-border",
          "sm:max-w-lg sm:mx-auto sm:rounded-t-3xl",
        )}
      >
        {/* Custom Header */}
        <SheetHeader className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-10 w-10 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SheetTitle className="sr-only">Detalhes do Agendamento</SheetTitle>
          <div className="flex items-center gap-2">
            {/* Quick Reminder Button */}
            {isConfirmed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className="rounded-xl gap-2"
              >
                {sendingReminder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Lembrete</span>
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-6 overflow-y-auto">
          {/* Status Badge for cancelled/no-show */}
          {(isNoShow || isCancelled) && (
            <div className="flex justify-center">
              <Badge
                className={cn(
                  "text-sm px-4 py-1.5",
                  isNoShow &&
                    "bg-amber-500/20 text-amber-500 border-amber-500/30",
                  isCancelled && "bg-red-500/20 text-red-500 border-red-500/30",
                )}
              >
                {isNoShow ? "Não compareceu" : "Cancelado"}
              </Badge>
            </div>
          )}

          {/* Date & Time Section */}
          <div className="space-y-1">
            <p
              className={cn(
                "text-lg font-semibold",
                isCancelled && "line-through text-muted-foreground",
              )}
            >
              {formatDateLong(appointment.date)}
            </p>
            <p className="text-base font-mono text-muted-foreground">
              {appointment.startTime} às {appointment.endTime}
            </p>
          </div>

          {/* Client Section */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cliente
            </p>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xl font-semibold text-primary truncate max-w-[200px]">
                  {clientName}
                </p>
                {clientPhone && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {formatPhone(clientPhone)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Client History */}
                {onViewClientHistory && clientId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onViewClientHistory(clientId, clientType)}
                    className="h-10 w-10 rounded-xl"
                    title="Ver histórico"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                )}
                {/* WhatsApp */}
                {clientPhone && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleWhatsApp}
                    className="h-10 w-10 rounded-xl hover:text-[#25D366] hover:border-[#25D366]"
                    title="Enviar WhatsApp"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </Button>
                )}
                {/* Edit Client - placeholder for future */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl"
                  title="Editar cliente"
                  disabled
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Service Section */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Serviço
            </p>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-sm px-4 py-2 rounded-xl",
                  isCancelled && "opacity-50",
                )}
              >
                {appointment.service.name}
              </Badge>
            </div>
          </div>

          {/* Total Section */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p
              className={cn(
                "text-3xl font-bold font-mono",
                isCancelled && "line-through text-muted-foreground",
              )}
            >
              {formatCurrency(Number(appointment.service.price))}
            </p>
          </div>

          {/* Decorative Divider */}
          <div className="relative py-4">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-border" />
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background" />
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background" />
          </div>

          {/* Barcode */}
          <BarcodeDecoration code={ticketCode} />

          {/* Cancel Reason */}
          {appointment.cancelReason && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-sm text-destructive">
                <strong>Motivo:</strong> {appointment.cancelReason}
              </p>
            </div>
          )}

          {/* Actions */}
          {(canCancel || canMarkNoShow) && (
            <div className="space-y-2 pt-2">
              {canMarkNoShow && (
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={handleMarkNoShow}
                  disabled={isMarkingNoShow}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  {isMarkingNoShow ? "Marcando..." : "Marcar não compareceu"}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  <X className="h-4 w-4 mr-2" />
                  {isCancelling ? "Cancelando..." : "Cancelar agendamento"}
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
