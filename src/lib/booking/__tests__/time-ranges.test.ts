import { describe, it, expect } from "vitest";
import {
  isRangeWithin,
  rangesOverlap,
  slotToRangeMinutes,
  toTimeRangeMinutes,
} from "../time-ranges";

describe("lib/booking/time-ranges", () => {
  it("toTimeRangeMinutes converts HH:mm strings into minute ranges", () => {
    expect(toTimeRangeMinutes("09:00", "10:30")).toEqual({
      start: 540,
      end: 630,
    });
  });

  it("rangesOverlap follows [A,B) semantics", () => {
    // Touching boundaries should NOT overlap
    expect(rangesOverlap({ start: 0, end: 30 }, { start: 30, end: 60 })).toBe(
      false,
    );

    // Partial overlap
    expect(rangesOverlap({ start: 0, end: 31 }, { start: 30, end: 60 })).toBe(
      true,
    );

    // Contained overlap
    expect(rangesOverlap({ start: 0, end: 60 }, { start: 10, end: 20 })).toBe(
      true,
    );
  });

  it("isRangeWithin checks containment", () => {
    expect(isRangeWithin({ start: 10, end: 20 }, { start: 0, end: 60 })).toBe(
      true,
    );
    expect(isRangeWithin({ start: 0, end: 60 }, { start: 10, end: 20 })).toBe(
      false,
    );
  });

  it("slotToRangeMinutes builds [start, start+duration)", () => {
    expect(slotToRangeMinutes("10:00", 30)).toEqual({ start: 600, end: 630 });
  });
});
