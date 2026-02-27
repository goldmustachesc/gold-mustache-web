import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBarber } from "@/lib/auth/requireBarber";

export async function GET() {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const barberExtra = await prisma.barber.findUnique({
      where: { id: auth.barberId },
      select: { avatarUrl: true },
    });

    return NextResponse.json({
      barber: {
        id: auth.barberId,
        name: auth.barberName,
        avatarUrl: barberExtra?.avatarUrl ?? null,
      },
    });
  } catch (error) {
    console.error("Error fetching barber profile:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Erro ao buscar perfil",
      },
      { status: 500 },
    );
  }
}
