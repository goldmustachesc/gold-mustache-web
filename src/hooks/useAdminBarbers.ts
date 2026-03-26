"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiMutate } from "@/lib/api/client";

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

export function useAdminBarbers() {
  return useQuery({
    queryKey: ["admin", "barbers"],
    queryFn: () => apiGet<Barber[]>("/api/admin/barbers"),
    staleTime: 30000,
  });
}

export function useCreateBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBarberInput) =>
      apiMutate<Barber>("/api/admin/barbers", "POST", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export function useUpdateBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateBarberInput & { id: string }) =>
      apiMutate<Barber>(`/api/admin/barbers/${id}`, "PUT", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export function useDeleteBarber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiMutate<{ success: boolean; softDelete: boolean; message: string }>(
        `/api/admin/barbers/${id}`,
        "DELETE",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export type { Barber, CreateBarberInput, UpdateBarberInput };
