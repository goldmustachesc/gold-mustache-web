import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { TierBadge, type LoyaltyTier } from "./TierBadge";
import { TierProgress } from "./TierProgress";

interface LoyaltyCardProps {
  points: number;
  tier: LoyaltyTier;
  className?: string;
}

export function LoyaltyCard({
  points,
  tier,
  className = "",
}: LoyaltyCardProps) {
  const t = useTranslations("loyalty.dashboard");

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <TierBadge tier={tier} className="text-lg px-3 py-1" />
      </CardHeader>
      <CardContent className="mt-4">
        <div className="text-5xl font-black text-primary mb-6">
          {points}{" "}
          <span className="text-sm font-normal text-muted-foreground uppercase">
            {t("pointsBalance")}
          </span>
        </div>

        <TierProgress currentPoints={points} currentTier={tier} />
      </CardContent>
    </Card>
  );
}
