import { describe, it, expect } from "vitest";
import {
  canCancelBeforeStart,
  canClientCancelOutsideWindow,
  isCancellationBlocked,
  getAppointmentCancellationStatus,
  CANCELLATION_BLOCK_WINDOW_MINUTES,
  shouldWarnLateCancellation,
} from "../cancellation";

describe("lib/booking/cancellation", () => {
  describe("canCancelBeforeStart (deprecated)", () => {
    it("allows only future appointments (minutesUntil > 0)", () => {
      expect(canCancelBeforeStart(1)).toBe(true);
      expect(canCancelBeforeStart(120)).toBe(true);
      expect(canCancelBeforeStart(0)).toBe(false);
      expect(canCancelBeforeStart(-1)).toBe(false);
    });
  });

  describe("canClientCancelOutsideWindow", () => {
    it("blocks cancellation within 2h window", () => {
      expect(
        canClientCancelOutsideWindow(CANCELLATION_BLOCK_WINDOW_MINUTES + 1),
      ).toBe(true);
      expect(
        canClientCancelOutsideWindow(CANCELLATION_BLOCK_WINDOW_MINUTES),
      ).toBe(false);
      expect(canClientCancelOutsideWindow(119)).toBe(false);
      expect(canClientCancelOutsideWindow(1)).toBe(false);
      expect(canClientCancelOutsideWindow(0)).toBe(false);
      expect(canClientCancelOutsideWindow(-1)).toBe(false);
    });

    it("accepts custom window", () => {
      expect(canClientCancelOutsideWindow(61, 60)).toBe(true);
      expect(canClientCancelOutsideWindow(60, 60)).toBe(false);
    });
  });

  describe("isCancellationBlocked", () => {
    it("returns true only when within the blocked window (>0 and <=2h)", () => {
      expect(isCancellationBlocked(CANCELLATION_BLOCK_WINDOW_MINUTES + 1)).toBe(
        false,
      );
      expect(isCancellationBlocked(CANCELLATION_BLOCK_WINDOW_MINUTES)).toBe(
        true,
      );
      expect(isCancellationBlocked(119)).toBe(true);
      expect(isCancellationBlocked(1)).toBe(true);
      expect(isCancellationBlocked(0)).toBe(false);
      expect(isCancellationBlocked(-1)).toBe(false);
    });
  });

  describe("getAppointmentCancellationStatus", () => {
    it("returns correct status for appointments outside window", () => {
      const status = getAppointmentCancellationStatus(
        CANCELLATION_BLOCK_WINDOW_MINUTES + 1,
      );
      expect(status.canCancel).toBe(true);
      expect(status.isBlocked).toBe(false);
    });

    it("returns correct status for appointments within window", () => {
      const status = getAppointmentCancellationStatus(60);
      expect(status.canCancel).toBe(false);
      expect(status.isBlocked).toBe(true);
    });

    it("returns correct status for past appointments", () => {
      const status = getAppointmentCancellationStatus(-10);
      expect(status.canCancel).toBe(false);
      expect(status.isBlocked).toBe(false);
    });
  });

  describe("shouldWarnLateCancellation (deprecated)", () => {
    it("warns only inside the window", () => {
      expect(shouldWarnLateCancellation(1)).toBe(true);
      expect(
        shouldWarnLateCancellation(CANCELLATION_BLOCK_WINDOW_MINUTES - 1),
      ).toBe(true);
      expect(
        shouldWarnLateCancellation(CANCELLATION_BLOCK_WINDOW_MINUTES),
      ).toBe(false);
      expect(shouldWarnLateCancellation(0)).toBe(false);
      expect(shouldWarnLateCancellation(-5)).toBe(false);
    });

    it("accepts custom window", () => {
      expect(shouldWarnLateCancellation(9, 10)).toBe(true);
      expect(shouldWarnLateCancellation(10, 10)).toBe(false);
    });
  });
});
