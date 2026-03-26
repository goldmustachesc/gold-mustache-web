"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateAdminServiceInput,
  UpdateAdminServiceInput,
} from "@/lib/validations/service";
import { apiGet, apiMutate } from "@/lib/api/client";

// ============================================
// Types
// ============================================

export interface AdminServiceData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Hooks
// ============================================

const STALE_TIME = 30_000;
const GC_TIME = 5 * 60_000;

export function useAdminServices() {
  return useQuery({
    queryKey: ["admin-services"],
    queryFn: () => apiGet<AdminServiceData[]>("/api/admin/services"),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useCreateAdminService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminServiceInput) =>
      apiMutate<AdminServiceData>("/api/admin/services", "POST", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "services",
      });
    },
  });
}

export function useUpdateAdminService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateAdminServiceInput & { id: string }) =>
      apiMutate<AdminServiceData>(`/api/admin/services/${id}`, "PUT", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "services",
      });
    },
  });
}

export function useToggleAdminServiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiMutate<AdminServiceData>(`/api/admin/services/${id}`, "PUT", {
        active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "services",
      });
    },
  });
}

export function useDeleteAdminService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiMutate<AdminServiceData>(`/api/admin/services/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "services",
      });
    },
  });
}
