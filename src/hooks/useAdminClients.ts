"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminClientData } from "@/app/api/admin/clients/route";
import { apiGetCollection } from "@/lib/api/client";

export function useAdminClients(search: string, enabled = true) {
  const params = new URLSearchParams();
  const trimmed = search.trim();
  if (trimmed) params.set("search", trimmed);
  params.set("type", "registered");
  params.set("limit", "20");

  return useQuery({
    queryKey: ["admin-clients", trimmed],
    queryFn: () =>
      apiGetCollection<AdminClientData>(`/api/admin/clients?${params}`),
    enabled,
    staleTime: 30000,
  });
}

export type { AdminClientData };
