import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const barbers = await prisma.barber.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ barbers });
  } catch (error) {
    console.error("Error fetching barbers:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar barbeiros" },
      { status: 500 },
    );
  }
}
