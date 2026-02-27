"use client";

import { useQuery } from "@tanstack/react-query";
import type { ProfileMeData } from "@/types/profile";
import { useUser } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api/client";

async function fetchProfileMe(): Promise<ProfileMeData> {
  const data = await apiGet<{ profile: ProfileMeData }>("/api/profile/me");
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
