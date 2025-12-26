import {
  isRangeWithin,
  rangesOverlap,
  slotToRangeMinutes,
  toTimeRangeMinutes,
} from "./time-ranges";

export type ShopHoursPolicy = {
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
};

export type TimeWindow = {
  startTime: string | null;
  endTime: string | null;
};

export function getShopSlotError(params: {
  slotStartTime: string;
  durationMinutes: number;
  shopHours: ShopHoursPolicy | null;
  closures: TimeWindow[];
}): null | "SHOP_CLOSED" {
  const { slotStartTime, durationMinutes, shopHours, closures } = params;

  if (
    !shopHours ||
    !shopHours.isOpen ||
    !shopHours.startTime ||
    !shopHours.endTime
  ) {
    return "SHOP_CLOSED";
  }

  const slotRange = slotToRangeMinutes(slotStartTime, durationMinutes);
  const shopOpenRange = toTimeRangeMinutes(
    shopHours.startTime,
    shopHours.endTime,
  );

  if (!isRangeWithin(slotRange, shopOpenRange)) {
    return "SHOP_CLOSED";
  }

  if (shopHours.breakStart && shopHours.breakEnd) {
    const shopBreakRange = toTimeRangeMinutes(
      shopHours.breakStart,
      shopHours.breakEnd,
    );
    if (rangesOverlap(slotRange, shopBreakRange)) {
      return "SHOP_CLOSED";
    }
  }

  // Any full-day closure blocks everything
  if (closures.some((c) => !c.startTime || !c.endTime)) {
    return "SHOP_CLOSED";
  }

  for (const closure of closures) {
    const closureRange = toTimeRangeMinutes(
      closure.startTime as string,
      closure.endTime as string,
    );
    if (rangesOverlap(slotRange, closureRange)) {
      return "SHOP_CLOSED";
    }
  }

  return null;
}
export function getAbsenceSlotError(params: {
  slotStartTime: string;
  durationMinutes: number;
  absences: TimeWindow[];
}): null | "BARBER_UNAVAILABLE" {
  const { slotStartTime, durationMinutes, absences } = params;

  // Any full-day absence blocks everything
  if (absences.some((a) => !a.startTime || !a.endTime)) {
    return "BARBER_UNAVAILABLE";
  }

  const slotRange = slotToRangeMinutes(slotStartTime, durationMinutes);
  for (const absence of absences) {
    const absenceRange = toTimeRangeMinutes(
      absence.startTime as string,
      absence.endTime as string,
    );
    if (rangesOverlap(slotRange, absenceRange)) {
      return "BARBER_UNAVAILABLE";
    }
  }

  return null;
}
