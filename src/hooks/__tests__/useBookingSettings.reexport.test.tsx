import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { BookingSettingsProvider } from "@/providers/booking-settings-provider";
import { useBookingSettings } from "../useBookingSettings";

describe("useBookingSettings (re-export)", () => {
  it("usa o mesmo contexto do BookingSettingsProvider", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BookingSettingsProvider
        bookingEnabled={true}
        externalBookingUrl={null}
        locale="pt-BR"
      >
        {children}
      </BookingSettingsProvider>
    );

    const { result } = renderHook(() => useBookingSettings(), { wrapper });

    expect(result.current.mode).toBe("internal");
    expect(result.current.bookingHref).toBe("/pt-BR/agendar");
  });
});
