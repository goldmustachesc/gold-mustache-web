"use client";

import { useQuery } from "@tanstack/react-query";
import type { ProfileMeData } from "@/types/profile";
import { useUser } from "@/hooks/useAuth";

function getBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

async function fetchProfileMe(): Promise<ProfileMeData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/profile/me`);
  if (!res.ok) throw new Error("Erro ao carregar perfil");
  const data = await res.json();
  return data.profile;
}

export function useProfileMe() {
  const { data: user } = useUser();

  return useQuery({
    queryKey: ["profile-me", user?.id ?? null],
    queryFn: fetchProfileMe,
    enabled: !!user?.id,
  });
}
