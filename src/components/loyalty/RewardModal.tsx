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
import { useAdminCreateReward } from "@/hooks/useAdminRewards";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import type { Reward } from "./RewardCard";

interface RewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RewardModal({ open, onOpenChange }: RewardModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const createRewardMut = useAdminCreateReward();
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const tempRewardIdRef = useRef<string | null>(null);

  const clearAutoCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout and mounted state on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearAutoCloseTimeout();
    };
  }, [clearAutoCloseTimeout]);

  const handleSubmit = async (data: CreateRewardData) => {
    // Prevent multiple submissions
    if (createRewardMut.isPending) {
      return;
    }

    try {
      // Optimistic update: adicionar o novo item à lista imediatamente
      const tempId = `temp-${Date.now()}`;
      tempRewardIdRef.current = tempId; // Store for potential rollback
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

      // Update both public and admin query keys for consistency
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

      // Auto close after success with proper cleanup
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          onOpenChange(false);
          setSubmitted(false);
        }
        timeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Error creating reward:", error);

      // Remove specific temporary optimistic update from both caches
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

      // Invalidate cache to ensure fresh data on retry
      queryClient.invalidateQueries({ queryKey: ["loyalty", "rewards"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });

      // Don't close modal on error, let user try again
    }
  };

  const handleClose = () => {
    // Clear any pending timeout to prevent state updates on unmounted component
    clearAutoCloseTimeout();

    if (!createRewardMut.isPending) {
      onOpenChange(false);
      setSubmitted(false);
      tempRewardIdRef.current = null; // Clean up temp ID reference
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
