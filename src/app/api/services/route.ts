import { NextResponse } from "next/server";
import { getServices } from "@/services/booking";
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

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barberId") ?? undefined;

    const services = await getServices(barberId);

    return NextResponse.json({ services });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar serviços");
  }
}
