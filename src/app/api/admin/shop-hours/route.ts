import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { updateShopHoursSchema } from "@/lib/validations/booking";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const days = await prisma.shopHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ days });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const validation = updateShopHoursSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const updates = validation.data.days;

    const results = await prisma.$transaction(
      updates.map((d) =>
        prisma.shopHours.upsert({
          where: { dayOfWeek: d.dayOfWeek },
          create: {
            dayOfWeek: d.dayOfWeek,
            isOpen: d.isOpen,
            startTime: d.isOpen ? (d.startTime ?? null) : null,
            endTime: d.isOpen ? (d.endTime ?? null) : null,
            breakStart: d.breakStart ?? null,
            breakEnd: d.breakEnd ?? null,
          },
          update: {
            isOpen: d.isOpen,
            startTime: d.isOpen ? (d.startTime ?? null) : null,
            endTime: d.isOpen ? (d.endTime ?? null) : null,
            breakStart: d.breakStart ?? null,
            breakEnd: d.breakEnd ?? null,
          },
        }),
      ),
    );

    return NextResponse.json({ days: results });
  } catch (error) {
    console.error("Error updating shop hours:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao salvar horários" },
      { status: 500 },
    );
  }
}
