"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientData } from "@/app/api/barbers/me/clients/route";
import type { ClientAppointmentData } from "@/app/api/barbers/me/clients/[id]/appointments/route";
import { apiGet, apiGetCollection, apiMutate } from "@/lib/api/client";

interface CreateClientInput {
  fullName: string;
  phone: string;
}

interface UpdateClientInput {
  id: string;
  fullName: string;
  phone: string;
}

export function useBarberClients(search?: string, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", page.toString());
  params.set("limit", limit.toString());

  return useQuery({
    queryKey: ["barber-clients", search, page, limit],
    queryFn: () =>
      apiGetCollection<ClientData>(`/api/barbers/me/clients?${params}`),
    staleTime: 30000,
  });
}

export function useClientAppointments(clientId: string | null) {
  return useQuery({
    queryKey: ["client-appointments", clientId],
    queryFn: () =>
      clientId
        ? apiGet<ClientAppointmentData[]>(
            `/api/barbers/me/clients/${clientId}/appointments`,
          )
        : [],
    enabled: !!clientId,
    staleTime: 30000,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClientInput) =>
      apiMutate<ClientData>("/api/barbers/me/clients", "POST", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barber-clients"] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateClientInput) =>
      apiMutate<ClientData>(`/api/barbers/me/clients/${id}`, "PATCH", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barber-clients"] });
    },
  });
}

export type { ClientData, ClientAppointmentData };
