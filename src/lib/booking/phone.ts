/**
 * Normalizes a phone string to digits-only.
 *
 * Used for guest bookings and lookups where the DB stores the phone as digits.
 */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normalizes phone digits and returns null when the result is empty.
 */
export function normalizePhoneOrNull(
  input: null | string | undefined,
): null | string {
  if (!input) return null;
  const normalized = normalizePhoneDigits(input);
  return normalized ? normalized : null;
}
