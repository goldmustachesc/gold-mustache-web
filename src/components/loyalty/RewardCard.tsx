"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { OptimizedImage } from "@/components/ui/optimized-image";

export interface Reward {
  id: string;
  name: string;
  description?: string;
  costInPoints: number;
  imageUrl?: string;
  active?: boolean;
  type?: "DISCOUNT" | "FREE_SERVICE" | "PRODUCT";
  value?: number;
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onRedeem: (rewardId: string) => Promise<void>;
  isRedeeming?: boolean;
}

export function RewardCard({
  reward,
  userPoints,
  onRedeem,
  isRedeeming = false,
}: RewardCardProps) {
  const t = useTranslations("loyalty.rewards");
  const [open, setOpen] = useState(false);

  const canAfford = userPoints >= reward.costInPoints;
  const isInStock = reward.stock === undefined || reward.stock > 0;
  const canRedeem = canAfford && isInStock && reward.active !== false;

  const handleRedeem = async () => {
    await onRedeem(reward.id);
    setOpen(false);
  };

  return (
    <Card className="overflow-hidden flex flex-col border border-border shadow-sm transition-shadow duration-200 hover:shadow-md">
      {reward.imageUrl && (
        <div className="relative h-48 w-full bg-muted">
          <OptimizedImage
            src={reward.imageUrl}
            alt={reward.name}
            fill
            className="object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-xl font-playfair">{reward.name}</CardTitle>
          <div className="flex flex-col items-end">
            <span className="font-bold font-mono tabular-nums text-primary whitespace-nowrap bg-primary/10 px-2.5 py-1 rounded-md text-sm">
              {reward.costInPoints} pts
            </span>
          </div>
        </div>
        <CardDescription>{reward.description || ""}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1" />

      <CardFooter>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full font-semibold"
              disabled={!canRedeem || isRedeeming}
            >
              {isRedeeming
                ? "Processando..."
                : !canRedeem && !isInStock
                  ? "Sem Estoque"
                  : !canRedeem && !canAfford
                    ? t("insufficientPoints")
                    : t("redeem")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("confirmRedeem")}</DialogTitle>
              <DialogDescription className="py-4 text-base space-y-2">
                <p>
                  Sua recompensa: <strong>{reward.name}</strong>
                </p>
                <p>
                  Custo:{" "}
                  <strong className="font-mono tabular-nums">
                    {reward.costInPoints} pontos
                  </strong>
                </p>
                <p>
                  Seu Saldo atual:{" "}
                  <strong className="font-mono tabular-nums">
                    {userPoints} pontos
                  </strong>
                </p>
                {reward.stock !== undefined && (
                  <p>
                    Estoque disponível:{" "}
                    <strong className="font-mono tabular-nums">
                      {reward.stock} unidades
                    </strong>
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isRedeeming}
              >
                Cancelar
              </Button>
              <Button onClick={handleRedeem} disabled={isRedeeming}>
                {isRedeeming ? "Processando..." : t("confirmRedeem")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
