"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateFeatureFlagsInput } from "@/app/api/admin/feature-flags/route";
import { apiGet, apiMutate } from "@/lib/api/client";
import type { ResolvedFeatureFlag } from "@/services/feature-flags";

export interface AdminFeatureFlagsResponse {
  flags: ResolvedFeatureFlag[];
}

export function useAdminFeatureFlags() {
  return useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () =>
      apiGet<AdminFeatureFlagsResponse>("/api/admin/feature-flags"),
    staleTime: 30000,
  });
}

export function useUpdateAdminFeatureFlags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateFeatureFlagsInput) =>
      apiMutate<AdminFeatureFlagsResponse>(
        "/api/admin/feature-flags",
        "PUT",
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
  });
}

export type { UpdateFeatureFlagsInput };
