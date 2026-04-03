"use client";

import { useEffect, useState } from "react";
import {
  useAdminAdjustPoints,
  type AdminLoyaltyAccount,
} from "@/hooks/useAdminLoyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save } from "lucide-react";
import { useTranslations } from "next-intl";

export interface AdjustPointsDialogProps {
  open: boolean;
  /** Conta selecionada; `AdminLoyaltyAccount` cobre também `AdminLoyaltyAccountExtended`. */
  account: AdminLoyaltyAccount | null;
  onClose: () => void;
}

export function AdjustPointsDialog({
  open,
  account,
  onClose,
}: AdjustPointsDialogProps) {
  const t = useTranslations("loyalty.admin");
  const adjustPointsMut = useAdminAdjustPoints();
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    if (!open || !account) return;
    setAdjustAmount("");
    setAdjustReason("");
  }, [open, account]);

  const handleSaveAdjustment = async () => {
    if (!account || !adjustAmount) return;
    try {
      await adjustPointsMut.mutateAsync({
        accountId: account.id,
        points: parseInt(adjustAmount, 10),
        reason: adjustReason || "Ajuste manual admin",
      });
      onClose();
    } catch (e) {
      console.error(e);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle>{t("adjustPoints") || "Ajuste de Pontos"}</DialogTitle>
          <DialogDescription>
            Modificando saldo de{" "}
            <strong className="text-foreground">{account?.fullName}</strong>{" "}
            (Atual:{" "}
            <strong className="text-primary font-mono tabular-nums">
              {account?.points} pts
            </strong>
            ).
            <br />
            Use valores positivos para adicionar e negativos para remover
            pontos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="points" className="text-right">
              Pontos
            </Label>
            <Input
              id="points"
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="+100 ou -50"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              {t("reason") || "Motivo"}
            </Label>
            <Input
              id="reason"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Ex: Correção, Bônus extra..."
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveAdjustment}
            disabled={!adjustAmount || adjustPointsMut.isPending}
          >
            {adjustPointsMut.isPending ? (
              "Salvando..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
