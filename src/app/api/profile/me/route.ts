import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
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

    return NextResponse.json({
      profile: {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        phone: profile.phone,
        role: profile.role,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar perfil" },
      { status: 500 },
    );
  }
}
