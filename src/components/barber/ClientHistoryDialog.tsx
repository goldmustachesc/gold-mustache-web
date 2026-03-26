"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useClientAppointments,
  type ClientData,
} from "@/hooks/useBarberClients";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Scissors,
  User,
  XCircle,
} from "lucide-react";

interface ClientHistoryDialogProps {
  client: ClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG = {
  CONFIRMED: {
    label: "Confirmado",
    icon: Clock,
    color: "text-warning bg-warning/10",
  },
  COMPLETED: {
    label: "Concluído",
    icon: CheckCircle,
    color: "text-success bg-success/10",
  },
  CANCELLED_BY_CLIENT: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-destructive bg-destructive/10",
  },
  CANCELLED_BY_BARBER: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-destructive bg-destructive/10",
  },
  NO_SHOW: {
    label: "Não compareceu",
    icon: XCircle,
    color: "text-muted-foreground bg-muted",
  },
} as const;

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function ClientHistoryDialog({
  client,
  open,
  onOpenChange,
}: ClientHistoryDialogProps) {
  const { data: appointments = [], isLoading } = useClientAppointments(
    client?.id ?? null,
  );

  const totalSpent = appointments
    .filter((apt) => apt.status === "COMPLETED" || apt.status === "CONFIRMED")
    .reduce((sum, apt) => sum + apt.servicePrice, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Histórico de Agendamentos
          </DialogTitle>
          <DialogDescription>{client?.fullName}</DialogDescription>
        </DialogHeader>

        {!isLoading && appointments.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="text-muted-foreground text-xs">Total de visitas</p>
              <p className="text-xl font-bold text-foreground">
                {appointments.filter((a) => a.status === "COMPLETED").length}
              </p>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="text-muted-foreground text-xs">Total gasto</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Nenhum agendamento encontrado
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map((apt) => {
                const statusConfig =
                  STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ??
                  STATUS_CONFIG.CONFIRMED;
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "p-3 rounded-lg",
                      "bg-card border border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Scissors className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-foreground font-medium truncate">
                            {apt.serviceName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(apt.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {apt.startTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {apt.barberName}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-primary font-semibold text-sm">
                          {formatCurrency(apt.servicePrice)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                            statusConfig.color,
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
