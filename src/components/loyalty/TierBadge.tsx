import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

interface TierBadgeProps {
  tier: LoyaltyTier;
  className?: string;
}

const tierConfig: Record<
  LoyaltyTier,
  { bg: string; text: string; border: string }
> = {
  BRONZE: {
    bg: "bg-orange-700/10 dark:bg-orange-700/20",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-700/20 dark:border-orange-700/30",
  },
  SILVER: {
    bg: "bg-slate-200/60 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
  },
  GOLD: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
  },
  DIAMOND: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
};

export function TierBadge({ tier, className = "" }: TierBadgeProps) {
  const t = useTranslations("loyalty.tiers");

  const label = tier
    ? t(tier.toLowerCase() as "bronze" | "silver" | "gold" | "diamond")
    : "";
  const config = tierConfig[tier] ?? tierConfig.BRONZE;

  return (
    <Badge
      variant="outline"
      className={`font-semibold ${config.border} ${config.bg} ${config.text} ${className}`}
    >
      {label}
    </Badge>
  );
}
