import { apiSuccess, apiError } from "@/lib/api/response";
import { getGuestAppointmentsByToken } from "@/services/booking";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

/**
 * GET /api/appointments/guest/lookup
 * Fetches guest appointments using the X-Guest-Token header for authentication.
 * This is more secure than the old phone-based lookup as the token is:
 * - Not guessable (UUID v4 with 128 bits of entropy)
 * - Device-bound (stored in localStorage)
 */
export async function GET(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("guestAppointments", clientId);
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

    const accessToken = request.headers.get("X-Guest-Token");

    if (!accessToken) {
      return apiError("MISSING_TOKEN", "Token de acesso não fornecido", 401);
    }

    const appointments = await getGuestAppointmentsByToken(accessToken);
    return apiSuccess(appointments);
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar agendamentos");
  }
}
