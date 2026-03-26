import type { RedemptionStatus } from "@/types/loyalty";

export function deriveRedemptionStatus(redemption: {
  usedAt: Date | null;
  expiresAt: Date;
}): RedemptionStatus {
  if (redemption.usedAt) return "USED";
  if (redemption.expiresAt < new Date()) return "EXPIRED";
  return "PENDING";
}
