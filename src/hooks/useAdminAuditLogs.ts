"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGetCollection } from "@/lib/api/client";
import type { ApiCollectionResponse } from "@/types/api";

export interface AdminAuditLogRow {
  id: string;
  actorProfileId: string;
  actorName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminAuditFilters {
  page: number;
  limit: number;
  action?: string;
  resourceType?: string;
  actorProfileId?: string;
  from?: string;
  to?: string;
}

function buildQuery(filters: AdminAuditFilters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
  if (filters.action?.trim()) params.set("action", filters.action.trim());
  if (filters.resourceType?.trim()) {
    params.set("resourceType", filters.resourceType.trim());
  }
  if (filters.actorProfileId?.trim()) {
    params.set("actorProfileId", filters.actorProfileId.trim());
  }
  if (filters.from?.trim()) params.set("from", filters.from.trim());
  if (filters.to?.trim()) params.set("to", filters.to.trim());
  return params.toString();
}

export function useAdminAuditLogs(filters: AdminAuditFilters) {
  const query = buildQuery(filters);

  return useQuery({
    queryKey: ["admin-audit-logs", query],
    queryFn: () =>
      apiGetCollection<AdminAuditLogRow>(`/api/admin/audit?${query}`),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

export type AdminAuditCollection = ApiCollectionResponse<AdminAuditLogRow>;
