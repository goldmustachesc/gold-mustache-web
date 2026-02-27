import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Reward } from "@/components/loyalty/RewardCard";
import type { CreateRewardData } from "@/components/loyalty/RewardForm";
import { apiGet, apiMutate, apiAction } from "@/lib/api/client";

export interface AdminReward extends Reward {
  totalRedemptions?: number;
  activeRedemptions?: number;
  serviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export function useAdminRewards() {
  return useQuery({
    queryKey: ["admin", "loyalty", "rewards"],
    queryFn: () => apiGet<AdminReward[]>("/api/admin/loyalty/rewards"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminReward(id: string) {
  return useQuery({
    queryKey: ["admin", "loyalty", "rewards", id],
    queryFn: () => apiGet<AdminReward>(`/api/admin/loyalty/rewards/${id}`),
    enabled: !!id,
  });
}

export function useAdminCreateReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardData: CreateRewardData) => {
      const mappedData = {
        name: rewardData.name,
        description: rewardData.description,
        costInPoints: rewardData.pointsCost,
        type: rewardData.type,
        value: rewardData.value,
        imageUrl: rewardData.imageUrl,
        stock: rewardData.stock,
        active: rewardData.active,
      };
      return apiMutate<AdminReward>(
        "/api/admin/loyalty/rewards",
        "POST",
        mappedData,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", "rewards"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
    },
  });
}

export function useAdminUpdateReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminReward> }) =>
      apiMutate<AdminReward>(`/api/admin/loyalty/rewards/${id}`, "PUT", data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards", id],
      });
    },
  });
}

export function useAdminDeleteReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiAction(`/api/admin/loyalty/rewards/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "loyalty", "rewards"],
      });
    },
  });
}
