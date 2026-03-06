import { getServices } from "@/services/booking";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";

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

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barberId") ?? undefined;

    const services = await getServices(barberId);

    const response = apiSuccess(services);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return response;
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar serviços");
  }
}
