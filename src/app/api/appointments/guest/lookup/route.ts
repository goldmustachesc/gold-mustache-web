import { NextResponse } from "next/server";
import { getGuestAppointments } from "@/services/booking";
import { guestLookupSchema } from "@/lib/validations/booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = guestLookupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const appointments = await getGuestAppointments(validation.data.phone);
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Error fetching guest appointments:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar agendamentos" },
      { status: 500 },
    );
  }
}
