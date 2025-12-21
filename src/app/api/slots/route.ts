import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/services/booking";
import { getSlotsQuerySchema } from "@/lib/validations/booking";
import { parseDateString } from "@/utils/time-slots";

export async function GET(request: Request) {
  try {
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
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    // Use parseDateString to ensure correct local timezone interpretation
    // new Date("2025-12-15") interprets as UTC, causing wrong dayOfWeek
    const slots = await getAvailableSlots(
      parseDateString(validation.data.date),
      validation.data.barberId,
      validation.data.serviceId,
    );

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar horários" },
      { status: 500 },
    );
  }
}
