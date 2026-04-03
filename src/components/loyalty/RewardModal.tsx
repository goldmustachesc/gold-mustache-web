"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RewardForm, type CreateRewardData } from "./RewardForm";
import {
  useAdminCreateReward,
  useAdminReward,
  useAdminUpdateReward,
  type AdminReward,
} from "@/hooks/useAdminRewards";
import { CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import type { Reward } from "./RewardCard";

interface RewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando definido, o modal carrega a recompensa e opera em modo edição. */
  rewardId?: string | null;
}

function mapRewardToFormData(reward: AdminReward): Partial<CreateRewardData> {
  return {
    name: reward.name,
    description: reward.description ?? "",
    pointsCost: reward.costInPoints,
    type: reward.type ?? "FREE_SERVICE",
    value: reward.value,
    imageUrl: reward.imageUrl ?? "",
    stock: reward.stock ?? undefined,
    active: reward.active ?? true,
  };
}

export function RewardModal({
  open,
  onOpenChange,
  rewardId = null,
}: RewardModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const createRewardMut = useAdminCreateReward();
  const updateRewardMut = useAdminUpdateReward();
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const tempRewardIdRef = useRef<string | null>(null);

  const isEditMode = Boolean(rewardId);

  const {
    data: rewardDetail,
    isLoading: rewardLoading,
    isError: rewardError,
  } = useAdminReward(rewardId ?? "", { enabled: open && isEditMode });

  const clearAutoCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearAutoCloseTimeout();
    };
  }, [clearAutoCloseTimeout]);

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      tempRewardIdRef.current = null;
    }
  }, [open]);

  const mutationPending =
    createRewardMut.isPending || updateRewardMut.isPending;
  const mutationError = isEditMode
    ? updateRewardMut.error
    : createRewardMut.error;

  const handleSubmit = async (data: CreateRewardData) => {
    if (mutationPending) {
      return;
    }

    if (isEditMode && rewardId) {
      try {
        await updateRewardMut.mutateAsync({ id: rewardId, data });
        setSubmitted(true);
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            onOpenChange(false);
            setSubmitted(false);
          }
          timeoutRef.current = null;
        }, 2000);
      } catch (error) {
        console.error("Error updating reward:", error);
      }
      return;
    }

    try {
      const tempId = `temp-${Date.now()}`;
      tempRewardIdRef.current = tempId;
      const newReward = {
        id: tempId,
        name: data.name,
        description: data.description || "",
        costInPoints: data.pointsCost,
        imageUrl: data.imageUrl || undefined,
        active: data.active,
        type: data.type,
        value: data.value,
        stock: data.stock,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ["loyalty", "rewards"],
        (old: Reward[] | undefined) => {
          if (!old) return [newReward];
          return [...old, newReward];
        },
      );
      queryClient.setQueryData(
        ["admin", "loyalty", "rewards"],
        (old: Reward[] | undefined) => {
          if (!old) return [newReward];
          return [...old, newReward];
        },
      );

      await createRewardMut.mutateAsync(data);
      setSubmitted(true);

      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          onOpenChange(false);
          setSubmitted(false);
        }
        timeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Error creating reward:", error);

      const tempIdToRemove = tempRewardIdRef.current;
      if (tempIdToRemove) {
        queryClient.setQueryData(
          ["loyalty", "rewards"],
          (old: Reward[] | undefined) => {
            if (!old) return old;
            return old.filter((item: Reward) => item.id !== tempIdToRemove);
          },
        );
        queryClient.setQueryData(
          ["admin", "loyalty", "rewards"],
          (old: Reward[] | undefined) => {
            if (!old) return old;
            return old.filter((item: Reward) => item.id !== tempIdToRemove);
          },
        );
        tempRewardIdRef.current = null;
      }

      queryClient.invalidateQueries({ queryKey: ["loyalty", "rewards"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
    }
  };

  const handleClose = () => {
    clearAutoCloseTimeout();

    if (!mutationPending) {
      onOpenChange(false);
      setSubmitted(false);
      tempRewardIdRef.current = null;
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
    }
  };

  const errorTitle = isEditMode
    ? "Erro ao atualizar recompensa"
    : "Erro ao criar recompensa";

  const showFormLoader = isEditMode && rewardLoading;
  const showFormError = isEditMode && rewardError && !rewardLoading;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isEditMode ? "Editar Recompensa" : "Nova Recompensa"}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={mutationPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Atualize os dados da recompensa no catálogo de fidelidade."
              : "Crie uma nova recompensa para o catálogo de fidelidade."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {showFormLoader ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Carregando recompensa...
              </p>
            </div>
          ) : showFormError ? (
            <div className="py-8 text-center text-sm text-destructive">
              Não foi possível carregar esta recompensa. Tente novamente ou
              feche o modal.
            </div>
          ) : submitted ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {isEditMode ? "Recompensa atualizada!" : "Recompensa criada!"}
                </h3>
                <p className="text-muted-foreground">
                  {isEditMode
                    ? "As alterações foram salvas com sucesso."
                    : "A nova recompensa foi adicionada ao catálogo com sucesso."}
                </p>
              </div>
            </div>
          ) : !isEditMode || rewardDetail ? (
            <RewardForm
              key={rewardId ?? "create"}
              mode={isEditMode ? "edit" : "create"}
              initialData={
                isEditMode && rewardDetail
                  ? mapRewardToFormData(rewardDetail)
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isLoading={mutationPending}
            />
          ) : null}
        </div>

        {mutationError && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-destructive" />
              <div>
                <h4 className="font-semibold text-destructive">{errorTitle}</h4>
                <p className="text-sm text-destructive/80 mt-1">
                  {mutationError.message ||
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
