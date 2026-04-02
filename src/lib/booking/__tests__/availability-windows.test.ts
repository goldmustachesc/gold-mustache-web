import { describe, expect, it } from "vitest";
import {
  buildAvailabilityWindows,
  isStartTimeWithinAvailabilityWindows,
} from "../availability-windows";

describe("lib/booking/availability-windows", () => {
  it("returns the full working window when there are no blockers", () => {
    expect(
      buildAvailabilityWindows({
        workingStartTime: "09:00",
        workingEndTime: "18:00",
        serviceDurationMinutes: 30,
        closures: [],
        absences: [],
        appointments: [],
      }),
    ).toEqual([{ startTime: "09:00", endTime: "18:00" }]);
  });

  it("subtracts break, closures, absences and confirmed appointments", () => {
    expect(
      buildAvailabilityWindows({
        workingStartTime: "09:00",
        workingEndTime: "15:00",
        breakStart: "12:00",
        breakEnd: "13:00",
        serviceDurationMinutes: 30,
        closures: [{ startTime: "09:30", endTime: "10:00" }],
        absences: [{ startTime: "14:00", endTime: "15:00" }],
        appointments: [
          { startTime: "10:30", endTime: "11:15", status: "CONFIRMED" },
          { startTime: "13:15", endTime: "13:45", status: "CANCELLED" },
        ],
      }),
    ).toEqual([
      { startTime: "09:00", endTime: "09:30" },
      { startTime: "10:00", endTime: "10:30" },
      { startTime: "11:15", endTime: "12:00" },
      { startTime: "13:00", endTime: "14:00" },
    ]);
  });

  it("trims windows before the minimum allowed start time", () => {
    expect(
      buildAvailabilityWindows({
        workingStartTime: "09:00",
        workingEndTime: "11:00",
        serviceDurationMinutes: 30,
        closures: [],
        absences: [],
        appointments: [],
        minimumStartTime: "10:15",
      }),
    ).toEqual([{ startTime: "10:15", endTime: "11:00" }]);
  });

  it("checks whether a selected time fits completely inside an availability window", () => {
    const windows = [
      { startTime: "09:00", endTime: "10:30" },
      { startTime: "11:00", endTime: "12:00" },
    ];

    expect(
      isStartTimeWithinAvailabilityWindows({
        windows,
        startTime: "09:45",
        durationMinutes: 30,
      }),
    ).toBe(true);

    expect(
      isStartTimeWithinAvailabilityWindows({
        windows,
        startTime: "10:15",
        durationMinutes: 30,
      }),
    ).toBe(false);
  });
});
