import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BookingSettingsProvider,
  useBookingSettings,
} from "@/providers/booking-settings-provider";

function Probe() {
  const settings = useBookingSettings();
  return <pre data-testid="settings">{JSON.stringify(settings)}</pre>;
}

function renderWithProvider(props: {
  bookingEnabled: boolean;
  externalBookingUrl: string | null;
  locale: string;
}) {
  render(
    <BookingSettingsProvider {...props}>
      <Probe />
    </BookingSettingsProvider>,
  );

  const raw = screen.getByTestId("settings").textContent;
  return JSON.parse(raw || "{}");
}

describe("providers/booking-settings-provider", () => {
  it("exposes internal mode values", () => {
    const settings = renderWithProvider({
      bookingEnabled: true,
      externalBookingUrl: null,
      locale: "pt-BR",
    });

    expect(settings.mode).toBe("internal");
    expect(settings.bookingHref).toBe("/pt-BR/agendar");
    expect(settings.shouldShowBooking).toBe(true);
    expect(settings.isInternal).toBe(true);
    expect(settings.isExternal).toBe(false);
    expect(settings.isDisabled).toBe(false);
  });

  it("exposes external mode values", () => {
    const settings = renderWithProvider({
      bookingEnabled: true,
      externalBookingUrl: "https://example.com",
      locale: "pt-BR",
    });

    expect(settings.mode).toBe("external");
    expect(settings.bookingHref).toBe("https://example.com");
    expect(settings.shouldShowBooking).toBe(true);
    expect(settings.isInternal).toBe(false);
    expect(settings.isExternal).toBe(true);
    expect(settings.isDisabled).toBe(false);
  });

  it("exposes disabled mode values", () => {
    const settings = renderWithProvider({
      bookingEnabled: false,
      externalBookingUrl: "https://example.com",
      locale: "pt-BR",
    });

    expect(settings.mode).toBe("disabled");
    expect(settings.bookingHref).toBeNull();
    expect(settings.shouldShowBooking).toBe(false);
    expect(settings.isInternal).toBe(false);
    expect(settings.isExternal).toBe(false);
    expect(settings.isDisabled).toBe(true);
  });

  it("throws when used outside provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(
      "useBookingSettings must be used within BookingSettingsProvider",
    );
  });
});
