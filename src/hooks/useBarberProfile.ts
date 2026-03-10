"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "./useAuth";
import { apiGet, ApiError } from "@/lib/api/client";

interface BarberProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
}

async function fetchBarberProfile(): Promise<BarberProfile | null> {
  try {
    return await apiGet<BarberProfile>("/api/barbers/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function useBarberProfile() {
  const { data: user } = useUser();

  return useQuery({
    queryKey: ["barber-profile", user?.id],
    queryFn: fetchBarberProfile,
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
