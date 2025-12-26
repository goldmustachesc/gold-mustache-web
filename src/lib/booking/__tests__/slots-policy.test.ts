import { describe, it, expect } from "vitest";
import { getWorkingHoursSlotError } from "../slots-policy";

describe("lib/booking/slots-policy", () => {
  it("returns BARBER_UNAVAILABLE when slot range is outside working hours", () => {
    expect(
      getWorkingHoursSlotError({
        workingStartTime: "09:00",
        workingEndTime: "10:00",
        startTime: "09:30",
        durationMinutes: 60,
      }),
    ).toBe("BARBER_UNAVAILABLE");
  });

  it("returns SLOT_UNAVAILABLE when startTime is not aligned to generated slots", () => {
    expect(
      getWorkingHoursSlotError({
        workingStartTime: "09:00",
        workingEndTime: "10:00",
        startTime: "09:10",
        durationMinutes: 30,
      }),
    ).toBe("SLOT_UNAVAILABLE");
  });

  it("returns null for a valid boundary within working hours", () => {
    expect(
      getWorkingHoursSlotError({
        workingStartTime: "09:00",
        workingEndTime: "11:00",
        startTime: "10:00",
        durationMinutes: 30,
      }),
    ).toBe(null);
  });

  it("returns SLOT_UNAVAILABLE when startTime falls inside the break", () => {
    expect(
      getWorkingHoursSlotError({
        workingStartTime: "11:00",
        workingEndTime: "14:00",
        breakStart: "12:00",
        breakEnd: "13:00",
        startTime: "12:00",
        durationMinutes: 30,
      }),
    ).toBe("SLOT_UNAVAILABLE");
  });

  it("returns SLOT_UNAVAILABLE when the slot would cross into the break", () => {
    // 11:30-12:30 crosses break start 12:00 -> generateTimeSlots will skip it
    expect(
      getWorkingHoursSlotError({
        workingStartTime: "11:00",
        workingEndTime: "14:00",
        breakStart: "12:00",
        breakEnd: "13:00",
        startTime: "11:30",
        durationMinutes: 60,
      }),
    ).toBe("SLOT_UNAVAILABLE");
  });
});
