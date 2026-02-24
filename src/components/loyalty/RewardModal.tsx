"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RewardForm, type CreateRewardData } from "./RewardForm";
import { useAdminCreateReward } from "@/hooks/useAdminRewards";
import { useRewards } from "@/hooks/useLoyalty";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface RewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RewardModal({ open, onOpenChange }: RewardModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const createRewardMut = useAdminCreateReward();
  const queryClient = useQueryClient();
  const { data: rewards } = useRewards(); // Usar a mesma query da página

  const handleSubmit = async (data: CreateRewardData) => {
    try {
      // Optimistic update: adicionar o novo item à lista imediatamente
      const tempId = `temp-${Date.now()}`;
      const newReward = {
        id: tempId,
        name: data.name,
        description: data.description,
        costInPoints: data.pointsCost,
        imageUrl: data.imageUrl,
        active: data.active,
        type: data.type,
        value: data.value,
        stock: data.stock,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Usar a mesma query key que a página usa
      queryClient.setQueryData(["loyalty", "rewards"], (old: unknown[]) => {
        if (!old) return [newReward];
        return [...old, newReward];
      });

      await createRewardMut.mutateAsync(data);
      setSubmitted(true);

      // Auto close after success
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error("Error creating reward:", error);
      // Remover item temporário em caso de erro
      queryClient.setQueryData(["loyalty", "rewards"], (old: unknown) => {
        if (!old || !Array.isArray(old)) return old;
        return (old as Array<{ id: string }>).filter(
          (item: { id: string }) => !item.id.startsWith("temp-"),
        );
      });
      // Don't close modal on error, let user try again
    }
  };

  const handleClose = () => {
    if (!createRewardMut.isPending) {
      onOpenChange(false);
      setSubmitted(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Nova Recompensa
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={createRewardMut.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Crie uma nova recompensa para o catálogo de fidelidade.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Recompensa Criada!
                </h3>
                <p className="text-muted-foreground">
                  A nova recompensa foi adicionada ao catálogo com sucesso.
                </p>
              </div>
            </div>
          ) : (
            <RewardForm
              onSubmit={handleSubmit}
              isLoading={createRewardMut.isPending}
            />
          )}
        </div>

        {createRewardMut.error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-destructive" />
              <div>
                <h4 className="font-semibold text-destructive">
                  Erro ao criar recompensa
                </h4>
                <p className="text-sm text-destructive/80 mt-1">
                  {createRewardMut.error.message ||
                    "Ocorreu um erro inesperado. Tente novamente."}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
