import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import {
  shopClosureSchema,
  dateRangeQuerySchema,
} from "@/lib/validations/booking";
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
    const queryValidation = dateRangeQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    if (!queryValidation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        400,
        queryValidation.error.flatten().fieldErrors,
      );
    }

    const { startDate, endDate } = queryValidation.data;

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

    return apiSuccess(
      closures.map((c) => ({
        id: c.id,
        date: formatPrismaDateToString(c.date),
        startTime: c.startTime,
        endTime: c.endTime,
        reason: c.reason,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar fechamentos");
  }
}

export async function POST(request: Request) {
  const originError = requireValidOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await request.json();
    const validation = shopClosureSchema.safeParse(body);
    if (!validation.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Dados inválidos",
        422,
        validation.error.flatten().fieldErrors,
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

    return apiSuccess(
      {
        id: created.id,
        date: formatPrismaDateToString(created.date),
        startTime: created.startTime,
        endTime: created.endTime,
        reason: created.reason,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar fechamento");
  }
}
