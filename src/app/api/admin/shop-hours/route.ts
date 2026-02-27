import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
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
  const originError = requireValidOrigin(request);
  if (originError) return originError;

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
    return handlePrismaError(error, "Erro ao salvar horários");
  }
}
