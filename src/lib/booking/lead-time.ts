export const CLIENT_BOOKING_LEAD_MINUTES = 60;

export function isSlotTooSoonForClient(minutesUntilSlot: number): boolean {
  return minutesUntilSlot < CLIENT_BOOKING_LEAD_MINUTES;
}
