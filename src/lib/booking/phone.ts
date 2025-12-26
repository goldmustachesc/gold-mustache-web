/**
 * Normalizes a phone string to digits-only.
 *
 * Used for guest bookings and lookups where the DB stores the phone as digits.
 */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}
