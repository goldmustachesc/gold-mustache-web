"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientData } from "@/app/api/barbers/me/clients/route";
import type { ClientAppointmentData } from "@/app/api/barbers/me/clients/[id]/appointments/route";

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

interface ClientsResponse {
  clients: ClientData[];
}

interface CreateClientInput {
  fullName: string;
  phone: string;
}

interface UpdateClientInput {
  id: string;
  fullName: string;
  phone: string;
}

interface CreateClientResponse {
  client: ClientData;
}

interface AppointmentsResponse {
  appointments: ClientAppointmentData[];
}

async function fetchClients(search?: string): Promise<ClientData[]> {
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }
  const url = `${baseUrl}/api/barbers/me/clients${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Erro ao buscar clientes");
  }

  const data: ClientsResponse = await res.json();
  return data.clients;
}

async function fetchClientAppointments(
  clientId: string,
): Promise<ClientAppointmentData[]> {
  const baseUrl = getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/barbers/me/clients/${clientId}/appointments`,
  );

  if (!res.ok) {
    throw new Error("Erro ao buscar histórico");
  }

  const data: AppointmentsResponse = await res.json();
  return data.appointments;
}

async function createClient(input: CreateClientInput): Promise<ClientData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/barbers/me/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Erro ao criar cliente");
  }

  const data: CreateClientResponse = await res.json();
  return data.client;
}

async function updateClient(input: UpdateClientInput): Promise<ClientData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/barbers/me/clients/${input.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullName: input.fullName,
      phone: input.phone,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Erro ao atualizar cliente");
  }

  const data: CreateClientResponse = await res.json();
  return data.client;
}

export function useBarberClients(search?: string) {
  return useQuery({
    queryKey: ["barber-clients", search],
    queryFn: () => fetchClients(search),
    staleTime: 30000, // 30 seconds
  });
}

export function useClientAppointments(clientId: string | null) {
  return useQuery({
    queryKey: ["client-appointments", clientId],
    queryFn: () => (clientId ? fetchClientAppointments(clientId) : []),
    enabled: !!clientId,
    staleTime: 30000,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      // Invalidate all client queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["barber-clients"] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barber-clients"] });
    },
  });
}

export type { ClientData, ClientAppointmentData };
