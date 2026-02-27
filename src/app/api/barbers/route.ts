import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("api", clientId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Muitas requisições. Tente novamente em 1 minuto.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.reset),
          },
        },
      );
    }

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
    return handlePrismaError(error, "Erro ao buscar barbeiros");
  }
}
