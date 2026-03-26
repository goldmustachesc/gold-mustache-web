import { describe, it, expect } from "vitest";
import { getAbsenceSlotError, getShopSlotError } from "../availability-policy";

describe("lib/booking/availability-policy", () => {
  describe("getShopSlotError", () => {
    it("returns SHOP_CLOSED when shop is closed or missing hours", () => {
      expect(
        getShopSlotError({
          slotStartTime: "10:00",
          durationMinutes: 30,
          shopHours: null,
          closures: [],
        }),
      ).toBe("SHOP_CLOSED");

      expect(
        getShopSlotError({
          slotStartTime: "10:00",
          durationMinutes: 30,
          shopHours: { isOpen: false, startTime: "09:00", endTime: "18:00" },
          closures: [],
        }),
      ).toBe("SHOP_CLOSED");

      expect(
        getShopSlotError({
          slotStartTime: "10:00",
          durationMinutes: 30,
          shopHours: { isOpen: true, startTime: null, endTime: "18:00" },
          closures: [],
        }),
      ).toBe("SHOP_CLOSED");
    });

    it("returns SHOP_CLOSED when slot is outside shop open range", () => {
      expect(
        getShopSlotError({
          slotStartTime: "08:30",
          durationMinutes: 30,
          shopHours: { isOpen: true, startTime: "09:00", endTime: "10:00" },
          closures: [],
        }),
      ).toBe("SHOP_CLOSED");

      // 09:30-10:30 ends after close
      expect(
        getShopSlotError({
          slotStartTime: "09:30",
          durationMinutes: 60,
          shopHours: { isOpen: true, startTime: "09:00", endTime: "10:00" },
          closures: [],
        }),
      ).toBe("SHOP_CLOSED");
    });

    it("returns SHOP_CLOSED when slot overlaps the shop break", () => {
      expect(
        getShopSlotError({
          slotStartTime: "12:00",
          durationMinutes: 30,
          shopHours: {
            isOpen: true,
            startTime: "09:00",
            endTime: "18:00",
            breakStart: "12:00",
            breakEnd: "13:00",
          },
          closures: [],
        }),
      ).toBe("SHOP_CLOSED");

      // Touching boundary should not overlap (13:00 starts at break end)
      expect(
        getShopSlotError({
          slotStartTime: "13:00",
          durationMinutes: 30,
          shopHours: {
            isOpen: true,
            startTime: "09:00",
            endTime: "18:00",
            breakStart: "12:00",
            breakEnd: "13:00",
          },
          closures: [],
        }),
      ).toBe(null);
    });

    it("returns SHOP_CLOSED for full-day closures", () => {
      expect(
        getShopSlotError({
          slotStartTime: "10:00",
          durationMinutes: 30,
          shopHours: { isOpen: true, startTime: "09:00", endTime: "18:00" },
          closures: [{ startTime: null, endTime: null }],
        }),
      ).toBe("SHOP_CLOSED");
    });

    it("returns SHOP_CLOSED when slot overlaps a partial closure", () => {
      expect(
        getShopSlotError({
          slotStartTime: "10:30",
          durationMinutes: 30,
          shopHours: { isOpen: true, startTime: "09:00", endTime: "18:00" },
          closures: [{ startTime: "10:00", endTime: "11:00" }],
        }),
      ).toBe("SHOP_CLOSED");

      // Touching boundary should not overlap (11:00 starts at closure end)
      expect(
        getShopSlotError({
          slotStartTime: "11:00",
          durationMinutes: 30,
          shopHours: { isOpen: true, startTime: "09:00", endTime: "18:00" },
          closures: [{ startTime: "10:00", endTime: "11:00" }],
        }),
      ).toBe(null);
    });

    it("returns null when shop policy allows the slot", () => {
      expect(
        getShopSlotError({
          slotStartTime: "10:00",
          durationMinutes: 30,
          shopHours: { isOpen: true, startTime: "09:00", endTime: "18:00" },
          closures: [],
        }),
      ).toBe(null);
    });
  });

  describe("getAbsenceSlotError", () => {
    it("returns BARBER_UNAVAILABLE for full-day absences", () => {
      expect(
        getAbsenceSlotError({
          slotStartTime: "10:00",
          durationMinutes: 30,
          absences: [{ startTime: null, endTime: null }],
        }),
      ).toBe("BARBER_UNAVAILABLE");
    });

    it("returns BARBER_UNAVAILABLE when slot overlaps an absence", () => {
      expect(
        getAbsenceSlotError({
          slotStartTime: "10:30",
          durationMinutes: 30,
          absences: [{ startTime: "10:00", endTime: "11:00" }],
        }),
      ).toBe("BARBER_UNAVAILABLE");
    });

    it("returns null when slot does not overlap absences", () => {
      expect(
        getAbsenceSlotError({
          slotStartTime: "11:00",
          durationMinutes: 30,
          absences: [{ startTime: "10:00", endTime: "11:00" }],
        }),
      ).toBe(null);
    });
  });
});
