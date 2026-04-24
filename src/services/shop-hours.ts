import { prisma } from "@/lib/prisma";
import type { ShopHours } from "@prisma/client";

export interface ShopHoursDayInput {
  dayOfWeek: number;
  isOpen: boolean;
  startTime?: string | null;
  endTime?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
}

/**
 * Retrieve all shop hours ordered by day of week.
 */
export async function getShopHours(): Promise<ShopHours[]> {
  return prisma.shopHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
}

/**
 * Upsert shop hours for multiple days in a single transaction.
 */
export async function updateShopHours(
  days: ShopHoursDayInput[],
): Promise<ShopHours[]> {
  return prisma.$transaction(
    days.map((d) =>
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
}
