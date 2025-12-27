import { NextResponse } from "next/server";
import { getGuestAppointmentsByToken } from "@/services/booking";

/**
 * GET /api/appointments/guest/lookup
 * Fetches guest appointments using the X-Guest-Token header for authentication.
 * This is more secure than the old phone-based lookup as the token is:
 * - Not guessable (UUID v4 with 128 bits of entropy)
 * - Device-bound (stored in localStorage)
 */
export async function GET(request: Request) {
  try {
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
