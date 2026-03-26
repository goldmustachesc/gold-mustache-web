"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBanClient, type ClientData } from "@/hooks/useBarberClients";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BanClientDialogProps {
  client: ClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BanClientDialog({
  client,
  open,
  onOpenChange,
}: BanClientDialogProps) {
  const [reason, setReason] = useState("");
  const banClient = useBanClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) return;

    try {
      await banClient.mutateAsync({
        clientId: client.id,
        reason: reason.trim() || undefined,
      });

      toast.success(`${client.fullName} foi banido com sucesso`);
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao banir cliente",
      );
    }
  };

  const handleClose = () => {
    if (!banClient.isPending) {
      setReason("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Banir Cliente
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">
              {client?.fullName}
            </span>{" "}
            será impedido de agendar horários. Agendamentos futuros confirmados
            serão cancelados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="ban-reason">Motivo (opcional)</Label>
            <Input
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Comportamento inadequado"
              maxLength={500}
              disabled={banClient.isPending}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={banClient.isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={banClient.isPending}
              className="flex-1"
            >
              {banClient.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Banindo...
                </>
              ) : (
                "Confirmar Ban"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
