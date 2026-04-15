export const CLIENT_BOOKING_LEAD_MINUTES = 90;

export function isSlotTooSoonForClient(minutesUntilSlot: number): boolean {
  return minutesUntilSlot < CLIENT_BOOKING_LEAD_MINUTES;
}
