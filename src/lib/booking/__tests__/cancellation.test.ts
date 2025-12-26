import { describe, it, expect } from "vitest";
import {
  canCancelBeforeStart,
  CANCELLATION_WARNING_WINDOW_MINUTES,
  shouldWarnLateCancellation,
} from "../cancellation";

describe("lib/booking/cancellation", () => {
  it("canCancelBeforeStart allows only future appointments (minutesUntil > 0)", () => {
    expect(canCancelBeforeStart(1)).toBe(true);
    expect(canCancelBeforeStart(120)).toBe(true);
    expect(canCancelBeforeStart(0)).toBe(false);
    expect(canCancelBeforeStart(-1)).toBe(false);
  });

  it("shouldWarnLateCancellation warns only inside the window", () => {
    expect(shouldWarnLateCancellation(1)).toBe(true);
    expect(
      shouldWarnLateCancellation(CANCELLATION_WARNING_WINDOW_MINUTES - 1),
    ).toBe(true);
    expect(
      shouldWarnLateCancellation(CANCELLATION_WARNING_WINDOW_MINUTES),
    ).toBe(false);
    expect(shouldWarnLateCancellation(0)).toBe(false);
    expect(shouldWarnLateCancellation(-5)).toBe(false);
  });

  it("shouldWarnLateCancellation accepts custom window", () => {
    expect(shouldWarnLateCancellation(9, 10)).toBe(true);
    expect(shouldWarnLateCancellation(10, 10)).toBe(false);
  });
});
