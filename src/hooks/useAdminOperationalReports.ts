"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { OperationalReportsData } from "@/types/operations-report";

export function useAdminOperationalReports(month: number, year: number) {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  });

  return useQuery({
    queryKey: ["admin-operational-reports", month, year],
    queryFn: () =>
      apiGet<OperationalReportsData>(
        `/api/admin/reports/operations?${params.toString()}`,
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
