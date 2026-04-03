"use client";

import type { AdminReward } from "@/hooks/useAdminRewards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

export interface RewardAdminCardProps {
  reward: AdminReward;
  onEdit: (rewardId: string) => void;
  onDelete: (reward: AdminReward) => void;
  onToggle: (rewardId: string, active: boolean) => void;
  isTogglePending?: boolean;
}

export function RewardAdminCard({
  reward,
  onEdit,
  onDelete,
  onToggle,
  isTogglePending = false,
}: RewardAdminCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg gap-4",
        reward.active === false ? "bg-muted/10 opacity-60" : "bg-muted/20",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="font-bold flex flex-wrap items-center gap-2">
          <span className="truncate">{reward.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
            {reward.costInPoints} pts
          </span>
          {reward.active === false && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive shrink-0">
              Inativo
            </span>
          )}
        </div>
        {reward.description ? (
          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {reward.description}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`reward-active-${reward.id}`}
            className="text-muted-foreground text-sm"
          >
            Ativo
          </Label>
          <Switch
            id={`reward-active-${reward.id}`}
            checked={reward.active ?? true}
            onCheckedChange={(checked) => onToggle(reward.id, checked)}
            disabled={isTogglePending}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(reward.id)}
          className="gap-1"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onDelete(reward)}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>
    </div>
  );
}
