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
        { error: "UNAUTHORIZED", message: "Não autenticado" },
        { status: 401 },
      );
    }

    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Usuário não é barbeiro" },
        { status: 404 },
      );
    }

    return NextResponse.json({ barber });
  } catch (error) {
    console.error(
      "Error fetching barber profile:",
      error instanceof Error ? error.message : error,
    );
    console.error("Stack:", error instanceof Error ? error.stack : "N/A");
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Erro ao buscar perfil",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
