import { getBookingAvailability } from "@/services/booking";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getSlotsQuerySchema } from "@/lib/validations/booking";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";

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
    const date = searchParams.get("date");
    const barberId = searchParams.get("barberId");
    const serviceId = searchParams.get("serviceId");

    // Validate query params
    const validation = getSlotsQuerySchema.safeParse({
      date,
      barberId,
      serviceId,
    });

    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Parâmetros inválidos",
        422,
        validation.error.flatten().fieldErrors,
      );
    }

    const availability = await getBookingAvailability(
      parseIsoDateYyyyMmDdAsSaoPauloDate(validation.data.date),
      validation.data.barberId,
      validation.data.serviceId,
      { applyLeadTime: true },
    );

    const response = apiSuccess(availability);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    return response;
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar horários");
  }
}
