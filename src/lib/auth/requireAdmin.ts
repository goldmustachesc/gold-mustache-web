import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      ),
    };
  }

  let profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: user.id,
        fullName:
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0],
        phone: user.user_metadata?.phone || null,
      },
    });
  }

  if (profile.role !== UserRole.ADMIN) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN", message: "Acesso restrito a administradores" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    userId: user.id,
    profileId: profile.id,
    role: profile.role,
  };
}
