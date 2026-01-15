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
import { useUpdateClient, type ClientData } from "@/hooks/useBarberClients";
import { maskPhone } from "@/utils/masks";
import { Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditClientDialogProps {
  client: ClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: EditClientDialogProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const updateClient = useUpdateClient();

  // Populate form when client changes
  useEffect(() => {
    if (client) {
      setFullName(client.fullName);
      setPhone(formatPhoneForDisplay(client.phone));
    }
  }, [client]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) return;

    if (!fullName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error("Telefone deve ter 10 ou 11 dígitos");
      return;
    }

    try {
      await updateClient.mutateAsync({
        id: client.id,
        fullName: fullName.trim(),
        phone,
      });

      toast.success("Cliente atualizado com sucesso!");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar cliente",
      );
    }
  };

  const handleClose = () => {
    if (!updateClient.isPending) {
      onOpenChange(false);
    }
  };

  const isRegistered = client?.type === "registered";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Pencil className="h-5 w-5 text-amber-500" />
            Editar Cliente
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isRegistered
              ? "Clientes cadastrados gerenciam seus próprios dados."
              : "Atualize as informações do cliente convidado."}
          </DialogDescription>
        </DialogHeader>

        {isRegistered ? (
          <div className="py-6 text-center">
            <p className="text-zinc-400">
              Este cliente possui uma conta cadastrada e pode editar seus dados
              pelo próprio perfil.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName" className="text-zinc-300">
                Nome completo
              </Label>
              <Input
                id="editFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Digite o nome do cliente"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500"
                disabled={updateClient.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone" className="text-zinc-300">
                Telefone
              </Label>
              <Input
                id="editPhone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500"
                disabled={updateClient.isPending}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateClient.isPending}
                className="flex-1 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateClient.isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {updateClient.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
