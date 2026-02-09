import { describe, expect, it } from "vitest";
import { buildBookingHref, resolveBookingMode } from "@/lib/booking-mode";

describe("lib/booking-mode", () => {
  describe("resolveBookingMode", () => {
    it("returns disabled when booking is disabled", () => {
      expect(
        resolveBookingMode({
          bookingEnabled: false,
          externalBookingUrl: "https://example.com",
        }),
      ).toBe("disabled");
    });

    it("returns external when booking is enabled and external url exists", () => {
      expect(
        resolveBookingMode({
          bookingEnabled: true,
          externalBookingUrl: "https://example.com",
        }),
      ).toBe("external");
    });

    it("returns internal when booking is enabled and external url is null", () => {
      expect(
        resolveBookingMode({
          bookingEnabled: true,
          externalBookingUrl: null,
        }),
      ).toBe("internal");
    });
  });

  describe("buildBookingHref", () => {
    it("returns null for disabled mode", () => {
      expect(
        buildBookingHref({
          mode: "disabled",
          locale: "pt-BR",
          externalBookingUrl: "https://example.com",
        }),
      ).toBeNull();
    });

    it("returns external url for external mode", () => {
      expect(
        buildBookingHref({
          mode: "external",
          locale: "pt-BR",
          externalBookingUrl: "https://example.com",
        }),
      ).toBe("https://example.com");
    });

    it("returns null for external mode without url", () => {
      expect(
        buildBookingHref({
          mode: "external",
          locale: "pt-BR",
          externalBookingUrl: null,
        }),
      ).toBeNull();
    });

    it("returns internal route for internal mode", () => {
      expect(
        buildBookingHref({
          mode: "internal",
          locale: "pt-BR",
          externalBookingUrl: "https://example.com",
        }),
      ).toBe("/pt-BR/agendar");
    });
  });
});
