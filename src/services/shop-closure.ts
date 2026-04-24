import { prisma } from "@/lib/prisma";
import {
  formatPrismaDateToString,
  parseDateStringToUTC,
} from "@/utils/time-slots";
import type { Prisma } from "@prisma/client";

export interface ShopClosureData {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface CreateShopClosureInput {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

function formatClosure(c: {
  id: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ShopClosureData {
  return {
    id: c.id,
    date: formatPrismaDateToString(c.date),
    startTime: c.startTime,
    endTime: c.endTime,
    reason: c.reason,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/**
 * Retrieve shop closures, optionally filtered by date range.
 */
export async function getShopClosures(
  filter: DateRangeFilter = {},
): Promise<ShopClosureData[]> {
  const where: Prisma.ShopClosureWhereInput = {};

  const gteDate = filter.startDate
    ? parseDateStringToUTC(filter.startDate)
    : undefined;
  let ltDate: Date | undefined;
  if (filter.endDate) {
    ltDate = parseDateStringToUTC(filter.endDate);
    ltDate.setUTCDate(ltDate.getUTCDate() + 1);
  }
  if (gteDate || ltDate) {
    where.date = {
      ...(gteDate && { gte: gteDate }),
      ...(ltDate && { lt: ltDate }),
    };
  }

  const closures = await prisma.shopClosure.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return closures.map(formatClosure);
}

/**
 * Create a new shop closure.
 */
export async function createShopClosure(
  input: CreateShopClosureInput,
): Promise<ShopClosureData> {
  const created = await prisma.shopClosure.create({
    data: {
      date: parseDateStringToUTC(input.date),
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      reason: input.reason ?? null,
    },
  });

  return formatClosure(created);
}

/**
 * Delete a shop closure by id.
 * Returns false if the closure was not found, true on success.
 */
export async function deleteShopClosure(id: string): Promise<boolean> {
  const existing = await prisma.shopClosure.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.shopClosure.delete({ where: { id } });
  return true;
}
