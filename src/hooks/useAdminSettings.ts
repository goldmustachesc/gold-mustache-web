"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsInput } from "@/app/api/admin/settings/route";
import { apiGet, apiMutate } from "@/lib/api/client";

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
  featuredEnabled: boolean;
  featuredBadge: string;
  featuredTitle: string;
  featuredDescription: string;
  featuredDuration: string;
  featuredOriginalPrice: string;
  featuredDiscountedPrice: string;
  foundingYear: number;
  createdAt: string;
  updatedAt: string;
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => apiGet<BarbershopSettingsResponse>("/api/admin/settings"),
    staleTime: 30000,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSettingsInput) =>
      apiMutate<BarbershopSettingsResponse>(
        "/api/admin/settings",
        "PUT",
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

export type { BarbershopSettingsResponse, UpdateSettingsInput };
