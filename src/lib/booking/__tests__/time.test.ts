import { describe, it, expect } from "vitest";
import { calculateEndTime } from "../time";

describe("lib/booking/time", () => {
  it("calculateEndTime adds duration to start time", () => {
    expect(calculateEndTime("09:00", 30)).toBe("09:30");
    expect(calculateEndTime("09:30", 45)).toBe("10:15");
    expect(calculateEndTime("00:00", 15)).toBe("00:15");
  });
});
