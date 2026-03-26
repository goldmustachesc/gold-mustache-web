import type { BarberWorkingHoursDay } from "@/types/booking";
import type { BarberWorkingHoursDayInput } from "@/lib/validations/booking";
import type { Prisma } from "@prisma/client";

/**
 * Working hours record from database
 */
interface WorkingHoursRecord {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

/**
 * Transforms database working hours records into a full week response.
 * Returns all 7 days (0-6), with isWorking = false for days without records.
 *
 * @param workingHours - Array of working hours records from database
 * @returns Array of 7 days with working status and times
 */
export function buildWorkingHoursResponse(
  workingHours: WorkingHoursRecord[],
): BarberWorkingHoursDay[] {
  const hoursMap = new Map(workingHours.map((h) => [h.dayOfWeek, h]));

  return Array.from({ length: 7 }, (_, i) => {
    const existing = hoursMap.get(i);
    if (existing) {
      return {
        dayOfWeek: i,
        isWorking: true,
        startTime: existing.startTime,
        endTime: existing.endTime,
        breakStart: existing.breakStart,
        breakEnd: existing.breakEnd,
      };
    }
    return {
      dayOfWeek: i,
      isWorking: false,
      startTime: null,
      endTime: null,
      breakStart: null,
      breakEnd: null,
    };
  });
}

/**
 * Prisma transaction client type for working hours operations
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Upserts or deletes working hours for a barber within a transaction.
 * - If `isWorking` is true and times are provided, upserts the record
 * - If `isWorking` is false, deletes the record for that day (if exists)
 *
 * @param tx - Prisma transaction client
 * @param barberId - The barber's ID
 * @param days - Array of working hours data for each day
 */
export async function upsertWorkingHoursInTransaction(
  tx: PrismaTransactionClient,
  barberId: string,
  days: BarberWorkingHoursDayInput[],
): Promise<void> {
  for (const day of days) {
    if (day.isWorking && day.startTime && day.endTime) {
      // Upsert working day
      await tx.workingHours.upsert({
        where: {
          barberId_dayOfWeek: {
            barberId,
            dayOfWeek: day.dayOfWeek,
          },
        },
        create: {
          barberId,
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          breakStart: day.breakStart ?? null,
          breakEnd: day.breakEnd ?? null,
        },
        update: {
          startTime: day.startTime,
          endTime: day.endTime,
          breakStart: day.breakStart ?? null,
          breakEnd: day.breakEnd ?? null,
        },
      });
    } else {
      // Delete non-working day (if exists)
      await tx.workingHours.deleteMany({
        where: {
          barberId,
          dayOfWeek: day.dayOfWeek,
        },
      });
    }
  }
}
