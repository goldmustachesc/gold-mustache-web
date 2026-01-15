"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Barber {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  active: boolean;
  createdAt: string;
  _count: {
    appointments: number;
  };
}

interface CreateBarberInput {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface UpdateBarberInput {
  name?: string;
  avatarUrl?: string | null;
  active?: boolean;
}

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

async function fetchAdminBarbers(): Promise<Barber[]> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/barbers`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Erro ao buscar barbeiros");
  }
  const data = await res.json();
  return data.barbers;
}

async function createBarber(input: CreateBarberInput): Promise<Barber> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/barbers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Erro ao criar barbeiro");
  }
  const data = await res.json();
  return data.barber;
}

async function updateBarber({
  id,
  ...input
}: UpdateBarberInput & { id: string }): Promise<Barber> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/barbers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Erro ao atualizar barbeiro");
  }
  const data = await res.json();
  return data.barber;
}

async function deleteBarber(
  id: string,
): Promise<{ success: boolean; softDelete: boolean; message: string }> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/barbers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Erro ao remover barbeiro");
  }
  return res.json();
}

export function useAdminBarbers() {
  return useQuery({
    queryKey: ["admin", "barbers"],
    queryFn: fetchAdminBarbers,
    staleTime: 30000,
  });
}

export function useCreateBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBarber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export function useUpdateBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBarber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export function useDeleteBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBarber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export type { Barber, CreateBarberInput, UpdateBarberInput };
