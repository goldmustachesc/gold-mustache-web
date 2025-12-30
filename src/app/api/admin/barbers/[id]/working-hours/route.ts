import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { updateBarberWorkingHoursSchema } from "@/lib/validations/booking";
import {
  buildWorkingHoursResponse,
  upsertWorkingHoursInTransaction,
} from "@/lib/working-hours";

/**
 * GET /api/admin/barbers/[id]/working-hours
 * Admin fetches working hours for a specific barber
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id: barberId } = await params;

    // Verify barber exists
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: { id: true, name: true },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Barbeiro não encontrado" },
        { status: 404 },
      );
    }

    const workingHours = await prisma.workingHours.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: "asc" },
    });

    const days = buildWorkingHoursResponse(workingHours);

    return NextResponse.json({ barber, days });
  } catch (error) {
    console.error("Error fetching barber working hours:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar horários" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/barbers/[id]/working-hours
 * Admin updates working hours for a specific barber
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { id: barberId } = await params;

    // Verify barber exists
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: { id: true, name: true },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Barbeiro não encontrado" },
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
      await upsertWorkingHoursInTransaction(tx, barberId, days);
    });

    // Fetch updated hours
    const updatedHours = await prisma.workingHours.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: "asc" },
    });

    const result = buildWorkingHoursResponse(updatedHours);

    return NextResponse.json({ barber, days: result });
  } catch (error) {
    console.error("Error updating barber working hours:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao salvar horários" },
      { status: 500 },
    );
  }
}
