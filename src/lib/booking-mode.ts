export type BookingMode = "disabled" | "external" | "internal";

export interface BookingSettingsInput {
  bookingEnabled: boolean;
  externalBookingUrl?: string | null;
}

export function resolveBookingMode(
  settings: BookingSettingsInput,
): BookingMode {
  if (!settings.bookingEnabled) {
    return "disabled";
  }

  if (settings.externalBookingUrl) {
    return "external";
  }

  return "internal";
}

export function buildBookingHref({
  mode,
  locale,
  externalBookingUrl,
}: {
  mode: BookingMode;
  locale: string;
  externalBookingUrl?: string | null;
}): string | null {
  if (mode === "disabled") {
    return null;
  }

  if (mode === "external") {
    return externalBookingUrl || null;
  }

  return `/${locale}/agendar`;
}
