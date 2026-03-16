"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUnbanClient, type ClientData } from "@/hooks/useBarberClients";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface UnbanClientDialogProps {
  client: ClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnbanClientDialog({
  client,
  open,
  onOpenChange,
}: UnbanClientDialogProps) {
  const unbanClient = useUnbanClient();

  const handleUnban = async () => {
    if (!client) return;

    try {
      await unbanClient.mutateAsync(client.id);
      toast.success(`${client.fullName} foi desbanido com sucesso`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao desbanir cliente",
      );
    }
  };

  const handleClose = () => {
    if (!unbanClient.isPending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-success flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Desbanir Cliente
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">
              {client?.fullName}
            </span>{" "}
            poderá agendar horários novamente após ser desbanido.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={unbanClient.isPending}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUnban}
            disabled={unbanClient.isPending}
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
          >
            {unbanClient.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Desbanindo...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
