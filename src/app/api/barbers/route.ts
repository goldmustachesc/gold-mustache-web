import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api/response";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("api", clientId);
    if (!rateLimitResult.success) {
      const res = apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em 1 minuto.",
        429,
      );
      res.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining),
      );
      res.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset));
      return res;
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

    return apiSuccess(barbers);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar barbeiros");
  }
}
