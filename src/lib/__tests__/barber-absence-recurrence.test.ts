import { describe, expect, it } from "vitest";
import {
  buildAbsenceRecurrenceDates,
  buildAbsenceRecurrenceSummary,
} from "../barber-absence-recurrence";

describe("barber-absence-recurrence", () => {
  it("builds daily recurrence dates up to the requested end date", () => {
    expect(
      buildAbsenceRecurrenceDates({
        startDate: "2026-03-15",
        frequency: "DAILY",
        interval: 1,
        endsAt: "2026-03-17",
      }),
    ).toEqual({
      dates: ["2026-03-15", "2026-03-16", "2026-03-17"],
      truncated: false,
    });
  });

  it("builds weekly recurrence dates with interval", () => {
    expect(
      buildAbsenceRecurrenceDates({
        startDate: "2026-03-02",
        frequency: "WEEKLY",
        interval: 2,
        occurrenceCount: 3,
      }),
    ).toEqual({
      dates: ["2026-03-02", "2026-03-16", "2026-03-30"],
      truncated: false,
    });
  });

  it("skips invalid monthly dates like the 31st in shorter months", () => {
    expect(
      buildAbsenceRecurrenceDates({
        startDate: "2026-01-31",
        frequency: "MONTHLY",
        interval: 1,
        occurrenceCount: 3,
      }),
    ).toEqual({
      dates: ["2026-01-31", "2026-03-31", "2026-05-31"],
      truncated: false,
    });
  });

  it("marks recurrence as truncated when it exceeds the supported horizon", () => {
    expect(
      buildAbsenceRecurrenceDates({
        startDate: "2026-01-01",
        frequency: "DAILY",
        interval: 1,
        endsAt: "2027-02-01",
      }),
    ).toMatchObject({ truncated: true });
  });

  it("formats recurrence summary", () => {
    expect(
      buildAbsenceRecurrenceSummary({
        frequency: "WEEKLY",
        interval: 2,
        endsAt: "2026-04-12",
        occurrenceCount: null,
      }),
    ).toBe("a cada 2 semanas até 12-04-2026");
  });
});
