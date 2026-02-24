import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

interface TierBadgeProps {
  tier: LoyaltyTier;
  className?: string;
}

const tierConfig: Record<LoyaltyTier, { bg: string; text: string }> = {
  BRONZE: {
    bg: "bg-orange-700/10 dark:bg-orange-700/20",
    text: "text-orange-700 dark:text-orange-400",
  },
  SILVER: {
    bg: "bg-slate-300 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
  },
  GOLD: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  DIAMOND: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
  },
};

export function TierBadge({ tier, className = "" }: TierBadgeProps) {
  const t = useTranslations("loyalty.tiers");

  // Ensure we fallback to something if translation is missing or tier is invalid
  const label = tier
    ? t(tier.toLowerCase() as "bronze" | "silver" | "gold" | "diamond")
    : "";
  const config = tierConfig[tier] ?? tierConfig.BRONZE;

  return (
    <Badge
      variant="outline"
      className={`font-semibold border-transparent ${config.bg} ${config.text} ${className}`}
    >
      {label}
    </Badge>
  );
}
