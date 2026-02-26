import { NextResponse } from "next/server";
import { getGuestAppointmentsByToken } from "@/services/booking";
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

    const accessToken = request.headers.get("X-Guest-Token");

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "MISSING_TOKEN",
          message: "Token de acesso não fornecido",
        },
        { status: 401 },
      );
    }

    const appointments = await getGuestAppointmentsByToken(accessToken);
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Error fetching guest appointments:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar agendamentos" },
      { status: 500 },
    );
  }
}
