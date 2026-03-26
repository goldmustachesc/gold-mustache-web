import type { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api/response";

export type RequireBarberResult =
  | {
      ok: true;
      userId: string;
      barberId: string;
      barberName: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireBarber(): Promise<RequireBarberResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: apiError("UNAUTHORIZED", "Não autorizado", 401),
    };
  }

  const barber = await prisma.barber.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true, active: true },
  });

  if (!barber) {
    return {
      ok: false,
      response: apiError("FORBIDDEN", "Acesso restrito a barbeiros", 403),
    };
  }

  if (!barber.active) {
    return {
      ok: false,
      response: apiError("FORBIDDEN", "Barbeiro inativo", 403),
    };
  }

  return {
    ok: true,
    userId: user.id,
    barberId: barber.id,
    barberName: barber.name,
  };
}
