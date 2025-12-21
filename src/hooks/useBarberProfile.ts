"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "./useAuth";

interface BarberProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
}

async function fetchBarberProfile(): Promise<BarberProfile | null> {
  // Usa URL absoluta para evitar que o locale seja incluído no path
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${baseUrl}/api/barbers/me`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Erro ao verificar perfil de barbeiro");
  const data = await res.json();
  return data.barber;
}

export function useBarberProfile() {
  const { data: user } = useUser();

  return useQuery({
    queryKey: ["barber-profile", user?.id],
    queryFn: () => fetchBarberProfile(),
    enabled: !!user?.id,
  });
}
