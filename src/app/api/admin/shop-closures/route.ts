import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { shopClosureSchema } from "@/lib/validations/booking";
import {
  formatPrismaDateToString,
  parseDateStringToUTC,
} from "@/utils/time-slots";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.ShopClosureWhereInput = {};

    if (startDate) {
      where.date = {
        ...(where.date as object),
        gte: parseDateStringToUTC(startDate),
      };
    }
    if (endDate) {
      const endPlusOne = parseDateStringToUTC(endDate);
      endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);
      where.date = { ...(where.date as object), lt: endPlusOne };
    }

    const closures = await prisma.shopClosure.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({
      closures: closures.map((c) => ({
        id: c.id,
        date: formatPrismaDateToString(c.date),
        startTime: c.startTime,
        endTime: c.endTime,
        reason: c.reason,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching shop closures:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar fechamentos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const validation = shopClosureSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const {
      date,
      startTime = null,
      endTime = null,
      reason = null,
    } = validation.data;

    const created = await prisma.shopClosure.create({
      data: {
        date: parseDateStringToUTC(date),
        startTime,
        endTime,
        reason,
      },
    });

    return NextResponse.json(
      {
        closure: {
          id: created.id,
          date: formatPrismaDateToString(created.date),
          startTime: created.startTime,
          endTime: created.endTime,
          reason: created.reason,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating shop closure:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao criar fechamento" },
      { status: 500 },
    );
  }
}
