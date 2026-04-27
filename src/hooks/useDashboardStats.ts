"use client";

import type { DashboardStats } from "@/types/dashboard";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";

export function useDashboardStats(enabled = true, includeClientStats = true) {
  const searchParams = new URLSearchParams();
  if (!includeClientStats) {
    searchParams.set("includeClientStats", "false");
  }
  const query = searchParams.toString();

  return useQuery({
    queryKey: ["dashboard", "stats", includeClientStats],
    queryFn: () =>
      apiGet<DashboardStats>(`/api/dashboard/stats${query ? `?${query}` : ""}`),
    enabled,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });
}
