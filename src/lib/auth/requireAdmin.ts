import type { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { apiError } from "@/lib/api/response";

export type RequireAdminResult =
  | {
      ok: true;
      userId: string;
      profileId: string;
      role: UserRole;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireAdmin(): Promise<RequireAdminResult> {
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

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile || profile.role !== UserRole.ADMIN) {
    return {
      ok: false,
      response: apiError("FORBIDDEN", "Acesso restrito a administradores", 403),
    };
  }

  return {
    ok: true,
    userId: user.id,
    profileId: profile.id,
    role: profile.role,
  };
}
