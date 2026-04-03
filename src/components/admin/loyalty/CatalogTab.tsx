"use client";

import { useState } from "react";
import { useAdminToggleReward } from "@/hooks/useAdminLoyalty";
import {
  useAdminRewards,
  useAdminDeleteReward,
  type AdminReward,
} from "@/hooks/useAdminRewards";
import { RewardModal } from "@/components/loyalty/RewardModal";
import { RewardAdminCard } from "@/components/admin/loyalty/RewardAdminCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus } from "lucide-react";

export function CatalogTab() {
  const { data: rewards, isLoading } = useAdminRewards();
  const toggleRewardMut = useAdminToggleReward();
  const deleteRewardMut = useAdminDeleteReward();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReward | null>(null);

  const handleOpenNew = () => {
    setEditingRewardId(null);
    setModalOpen(true);
  };

  const handleEdit = (rewardId: string) => {
    setEditingRewardId(rewardId);
    setModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setEditingRewardId(null);
    }
  };

  const handleToggleReward = async (rewardId: string, active: boolean) => {
    try {
      await toggleRewardMut.mutateAsync({ rewardId, active });
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRewardMut.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Itens do Catálogo</h3>
          <Button type="button" onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" /> Novo Item
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {rewards?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma recompensa cadastrada. Clique em &quot;Novo Item&quot;
                para adicionar.
              </p>
            ) : (
              rewards?.map((r) => (
                <RewardAdminCard
                  key={r.id}
                  reward={r}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onToggle={handleToggleReward}
                  isTogglePending={toggleRewardMut.isPending}
                />
              ))
            )}
          </div>
        )}
      </div>

      <RewardModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        rewardId={editingRewardId}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recompensa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover &quot;{deleteTarget?.name}&quot;?
              Esta ação não pode ser desfeita. Só é possível excluir itens sem
              resgates associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRewardMut.isPending}>
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteRewardMut.isPending}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteRewardMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
