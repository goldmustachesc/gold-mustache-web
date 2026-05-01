export function getEffectiveDuration(
  durationOverride: number | null | undefined,
  serviceDuration: number,
): number {
  return durationOverride ?? serviceDuration;
}
