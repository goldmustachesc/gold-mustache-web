import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";
import type { LoyaltyTier } from "./TierBadge";

interface TierProgressProps {
  currentPoints: number;
  currentTier: LoyaltyTier;
  className?: string;
}

export function TierProgress({
  currentPoints,
  currentTier,
  className = "",
}: TierProgressProps) {
  const t = useTranslations("loyalty.tiers.progress");
  const tTiers = useTranslations("loyalty.tiers");

  const tiers = Object.entries(LOYALTY_CONFIG.TIERS) as [
    LoyaltyTier,
    { min: number; bonus: number },
  ][];

  // Find current and next
  const currentIndex = tiers.findIndex(([tier]) => tier === currentTier);
  const isMax = currentIndex === tiers.length - 1;

  let nextTier: LoyaltyTier | null = null;
  let pointsNeeded = 0;
  let progressPercentage = 100;

  if (!isMax) {
    nextTier = tiers[currentIndex + 1][0];
    const currentMin = tiers[currentIndex][1].min;
    const nextMin = tiers[currentIndex + 1][1].min;

    // Points needed to reach next tier
    pointsNeeded = nextMin - currentPoints;

    // Progress relative to the current tier's starting point
    const pointsInCurrentTier = currentPoints - currentMin;
    const tierRange = nextMin - currentMin;
    progressPercentage = Math.min(
      100,
      Math.max(0, (pointsInCurrentTier / tierRange) * 100),
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          {tTiers(
            currentTier.toLowerCase() as
              | "bronze"
              | "silver"
              | "gold"
              | "diamond",
          )}
        </span>
        <span>
          {nextTier
            ? tTiers(
                nextTier.toLowerCase() as
                  | "bronze"
                  | "silver"
                  | "gold"
                  | "diamond",
              )
            : ""}
        </span>
      </div>

      <Progress value={progressPercentage} className="h-2" />

      <div className="text-sm font-medium text-center text-muted-foreground mt-2">
        {isMax
          ? t("max")
          : t("next", {
              points: pointsNeeded,
              nextTier: nextTier
                ? tTiers(
                    nextTier.toLowerCase() as
                      | "bronze"
                      | "silver"
                      | "gold"
                      | "diamond",
                  )
                : "",
            })}
      </div>
    </div>
  );
}
