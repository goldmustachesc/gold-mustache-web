import { getAvailableSlots } from "@/services/booking";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getSlotsQuerySchema } from "@/lib/validations/booking";
import { checkRateLimit, getUserRateLimitIdentifier } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import { requireBarber } from "@/lib/auth/requireBarber";

export async function GET(request: Request) {
  try {
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const rateLimitResult = await checkRateLimit(
      "api",
      getUserRateLimitIdentifier(auth.userId),
    );
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

    const slots = await getAvailableSlots(
      parseIsoDateYyyyMmDdAsSaoPauloDate(validation.data.date),
      validation.data.barberId,
      validation.data.serviceId,
    );

    return apiSuccess(slots);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar horários");
  }
}
