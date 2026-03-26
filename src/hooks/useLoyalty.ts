import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoyaltyTier } from "@/components/loyalty/TierBadge";
import type { Reward } from "@/components/loyalty/RewardCard";
import { apiGet, apiGetCollection, apiMutate } from "@/lib/api/client";
import type { RedemptionStatus } from "@/types/loyalty";

export interface LoyaltyAccount {
  id: string;
  currentPoints: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  referralCode: string;
  referredById: string | null;
  referralsCount: number;
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
      referredById,
      referralsCount,
      createdAt,
      updatedAt,
    }) => ({
      id,
      currentPoints,
      lifetimePoints,
      tier,
      referralCode,
      referredById,
      referralsCount,
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

export interface RedemptionResult {
  id: string;
  code: string;
  pointsSpent: number;
  expiresAt: string;
  reward: { name: string; type: string } | null;
}

export interface Redemption {
  id: string;
  code: string;
  pointsSpent: number;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  status: RedemptionStatus;
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
      queryClient.invalidateQueries({ queryKey: ["loyalty", "redemptions"] });
    },
  });
}

export function useRedemptions(page = 1, limit = 10) {
  return useQuery({
    queryKey: ["loyalty", "redemptions", page, limit],
    queryFn: () =>
      apiGetCollection<Redemption>(
        `/api/loyalty/redemptions?page=${page}&limit=${limit}`,
      ),
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

interface ValidateReferralResult {
  valid: boolean;
  referrerName: string;
}

export function useValidateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) =>
      apiMutate<ValidateReferralResult>(
        "/api/loyalty/referral/validate",
        "POST",
        { code },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", "account"] });
    },
  });
}

interface ApplyReferralResult {
  applied: boolean;
  referrerName: string;
}

export function useApplyReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) =>
      apiMutate<ApplyReferralResult>("/api/loyalty/referral/apply", "POST", {
        code,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", "account"] });
    },
  });
}
