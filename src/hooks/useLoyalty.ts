import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoyaltyTier } from "@/components/loyalty/TierBadge";
import type { Reward } from "@/components/loyalty/RewardCard";

export interface LoyaltyAccount {
  id: string;
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  tierUpdatedAt: string;
}

export function useLoyaltyAccount() {
  return useQuery({
    queryKey: ["loyalty", "account"],
    queryFn: async () => {
      const response = await fetch("/api/loyalty/account");
      if (!response.ok) {
        throw new Error("Failed to fetch loyalty account");
      }
      const data = await response.json();
      return data.account as LoyaltyAccount;
    },
  });
}

// Hook para rewards - agora conectado ao backend real
export function useRewards() {
  return useQuery({
    queryKey: ["loyalty", "rewards"],
    queryFn: async () => {
      const response = await fetch("/api/loyalty/rewards");
      if (!response.ok) {
        throw new Error("Failed to fetch rewards");
      }
      const data = await response.json();
      return data.rewards as Reward[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await fetch("/api/loyalty/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      if (!response.ok) {
        throw new Error("Failed to redeem reward");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both account points and rewards or transactions
      queryClient.invalidateQueries({ queryKey: ["loyalty", "account"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty", "transactions"] });
    },
  });
}

export function useLoyaltyTransactions() {
  return useQuery({
    queryKey: ["loyalty", "transactions"],
    queryFn: async () => {
      const response = await fetch("/api/loyalty/transactions");
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const data = await response.json();
      return data.transactions;
    },
  });
}
