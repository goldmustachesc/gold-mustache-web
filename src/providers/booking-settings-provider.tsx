"use client";

import {
  buildBookingHref,
  resolveBookingMode,
  type BookingMode,
} from "@/lib/booking-mode";
import { createContext, useContext, useMemo } from "react";

interface BookingSettingsProviderProps {
  bookingEnabled: boolean;
  externalBookingUrl: string | null;
  locale: string;
  children: React.ReactNode;
}

interface BookingSettingsContextValue {
  bookingEnabled: boolean;
  externalBookingUrl: string | null;
  locale: string;
  mode: BookingMode;
  bookingHref: string | null;
  shouldShowBooking: boolean;
  isExternal: boolean;
  isInternal: boolean;
  isDisabled: boolean;
}

const BookingSettingsContext =
  createContext<BookingSettingsContextValue | null>(null);

export function BookingSettingsProvider({
  bookingEnabled,
  externalBookingUrl,
  locale,
  children,
}: BookingSettingsProviderProps) {
  const mode = useMemo(
    () => resolveBookingMode({ bookingEnabled, externalBookingUrl }),
    [bookingEnabled, externalBookingUrl],
  );

  const bookingHref = useMemo(
    () => buildBookingHref({ mode, locale, externalBookingUrl }),
    [mode, locale, externalBookingUrl],
  );

  const value = useMemo(
    () => ({
      bookingEnabled,
      externalBookingUrl,
      locale,
      mode,
      bookingHref,
      shouldShowBooking: mode !== "disabled" && !!bookingHref,
      isExternal: mode === "external",
      isInternal: mode === "internal",
      isDisabled: mode === "disabled",
    }),
    [bookingEnabled, externalBookingUrl, locale, mode, bookingHref],
  );

  return (
    <BookingSettingsContext.Provider value={value}>
      {children}
    </BookingSettingsContext.Provider>
  );
}

export function useBookingSettings() {
  const context = useContext(BookingSettingsContext);

  if (!context) {
    throw new Error(
      "useBookingSettings must be used within BookingSettingsProvider",
    );
  }

  return context;
}
