import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoyaltyTier } from "@/components/loyalty/TierBadge";
import type { Reward } from "@/components/loyalty/RewardCard";
import { apiGet, apiMutate } from "@/lib/api/client";

export interface LoyaltyAccount {
  id: string;
  currentPoints: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

export function useLoyaltyAccount() {
  return useQuery({
    queryKey: ["loyalty", "account"],
    queryFn: () => apiGet<LoyaltyAccount>("/api/loyalty/account"),
    select: ({
      id,
      currentPoints,
      lifetimePoints,
      tier,
      referralCode,
      createdAt,
      updatedAt,
    }) => ({
      id,
      currentPoints,
      lifetimePoints,
      tier,
      referralCode,
      createdAt,
      updatedAt,
    }),
  });
}

export function useRewards() {
  return useQuery({
    queryKey: ["loyalty", "rewards"],
    queryFn: () => apiGet<Reward[]>("/api/loyalty/rewards"),
    staleTime: 5 * 60 * 1000,
  });
}

interface RedemptionResult {
  id: string;
  code: string;
  pointsSpent: number;
  expiresAt: string;
  reward: { name: string; type: string } | null;
}

export function useRedeemReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardId: string) =>
      apiMutate<RedemptionResult>("/api/loyalty/redemptions", "POST", {
        rewardId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", "account"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty", "transactions"] });
    },
  });
}

interface LoyaltyTransaction {
  id: string;
  createdAt: string;
  description: string;
  type: string;
  points: number;
}

export function useLoyaltyTransactions() {
  return useQuery({
    queryKey: ["loyalty", "transactions"],
    queryFn: () => apiGet<LoyaltyTransaction[]>("/api/loyalty/transactions"),
  });
}
