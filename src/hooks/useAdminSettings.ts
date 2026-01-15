"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsInput } from "@/app/api/admin/settings/route";

interface BarbershopSettingsResponse {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string | null;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagramMain: string;
  instagramStore: string | null;
  googleMapsUrl: string | null;
  bookingEnabled: boolean;
  externalBookingUrl: string | null;
  foundingYear: number;
  createdAt: string;
  updatedAt: string;
}

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

async function fetchSettings(): Promise<BarbershopSettingsResponse> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/settings`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Erro ao buscar configurações");
  }
  const data = await res.json();
  return data.settings;
}

async function updateSettings(
  input: UpdateSettingsInput,
): Promise<BarbershopSettingsResponse> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/admin/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Erro ao salvar configurações");
  }
  const data = await res.json();
  return data.settings;
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchSettings,
    staleTime: 30000,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

export type { BarbershopSettingsResponse, UpdateSettingsInput };
