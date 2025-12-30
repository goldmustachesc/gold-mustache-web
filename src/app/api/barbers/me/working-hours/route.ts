import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateBarberWorkingHoursSchema } from "@/lib/validations/booking";
import {
  buildWorkingHoursResponse,
  upsertWorkingHoursInTransaction,
} from "@/lib/working-hours";

/**
 * GET /api/barbers/me/working-hours
 * Returns the logged-in barber's working hours for all 7 days
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_BARBER", message: "Usuário não é barbeiro" },
        { status: 404 },
      );
    }

    const workingHours = await prisma.workingHours.findMany({
      where: { barberId: barber.id },
      orderBy: { dayOfWeek: "asc" },
    });

    const days = buildWorkingHoursResponse(workingHours);

    return NextResponse.json({ days });
  } catch (error) {
    console.error("Error fetching barber working hours:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar horários" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/barbers/me/working-hours
 * Updates the logged-in barber's working hours (bulk upsert/delete)
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_BARBER", message: "Usuário não é barbeiro" },
        { status: 404 },
      );
    }

    // Parse JSON body with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_JSON", message: "Corpo da requisição inválido" },
        { status: 400 },
      );
    }

    const validation = updateBarberWorkingHoursSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { days } = validation.data;

    // Process each day: upsert if working, delete if not working
    await prisma.$transaction(async (tx) => {
      await upsertWorkingHoursInTransaction(tx, barber.id, days);
    });

    // Fetch updated hours
    const updatedHours = await prisma.workingHours.findMany({
      where: { barberId: barber.id },
      orderBy: { dayOfWeek: "asc" },
    });

    const result = buildWorkingHoursResponse(updatedHours);

    return NextResponse.json({ days: result });
  } catch (error) {
    console.error("Error updating barber working hours:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao salvar horários" },
      { status: 500 },
    );
  }
}
