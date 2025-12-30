"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateAdminServiceInput,
  UpdateAdminServiceInput,
} from "@/lib/validations/service";

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
// Helper Functions
// ============================================

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

// ============================================
// API Functions
// ============================================

async function fetchAdminServices(): Promise<AdminServiceData[]> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/services`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao carregar serviços");
  return data.services;
}

async function createAdminService(
  input: CreateAdminServiceInput,
): Promise<AdminServiceData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao criar serviço");
  return data.service;
}

async function updateAdminService({
  id,
  ...input
}: UpdateAdminServiceInput & { id: string }): Promise<AdminServiceData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/services/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao atualizar serviço");
  return data.service;
}

async function toggleAdminServiceStatus({
  id,
  active,
}: {
  id: string;
  active: boolean;
}): Promise<AdminServiceData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/services/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(data?.message || "Erro ao alterar status do serviço");
  return data.service;
}

async function deleteAdminService(id: string): Promise<AdminServiceData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/services/${id}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Erro ao desativar serviço");
  return data.service;
}

// ============================================
// Hooks
// ============================================

// Cache configuration
const STALE_TIME = 30_000; // 30 seconds
const GC_TIME = 5 * 60_000; // 5 minutes

/**
 * Hook to fetch all services (including inactive) for admin management
 */
export function useAdminServices() {
  return useQuery({
    queryKey: ["admin-services"],
    queryFn: fetchAdminServices,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

/**
 * Hook to create a new service
 */
export function useCreateAdminService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdminService,
    onSuccess: () => {
      // Invalidate admin services list
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      // Invalidate public services list (all variations: with/without barberId)
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "services",
      });
    },
  });
}

/**
 * Hook to update an existing service
 */
export function useUpdateAdminService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAdminService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "services",
      });
    },
  });
}

/**
 * Hook to toggle service active status
 */
export function useToggleAdminServiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleAdminServiceStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "services",
      });
    },
  });
}

/**
 * Hook to delete (soft delete) a service
 */
export function useDeleteAdminService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "services",
      });
    },
  });
}
