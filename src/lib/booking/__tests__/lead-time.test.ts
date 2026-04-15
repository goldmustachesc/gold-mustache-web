import { describe, it, expect } from "vitest";
import {
  CLIENT_BOOKING_LEAD_MINUTES,
  isSlotTooSoonForClient,
} from "../lead-time";

describe("lib/booking/lead-time", () => {
  describe("CLIENT_BOOKING_LEAD_MINUTES", () => {
    it("is 90 minutes", () => {
      expect(CLIENT_BOOKING_LEAD_MINUTES).toBe(90);
    });
  });

  describe("isSlotTooSoonForClient", () => {
    it("returns true when less than 90 minutes away", () => {
      expect(isSlotTooSoonForClient(89)).toBe(true);
      expect(isSlotTooSoonForClient(60)).toBe(true);
      expect(isSlotTooSoonForClient(30)).toBe(true);
      expect(isSlotTooSoonForClient(1)).toBe(true);
      expect(isSlotTooSoonForClient(0)).toBe(true);
      expect(isSlotTooSoonForClient(-10)).toBe(true);
    });

    it("returns false when exactly 90 minutes away", () => {
      expect(isSlotTooSoonForClient(90)).toBe(false);
    });

    it("returns false when more than 90 minutes away", () => {
      expect(isSlotTooSoonForClient(91)).toBe(false);
      expect(isSlotTooSoonForClient(120)).toBe(false);
      expect(isSlotTooSoonForClient(480)).toBe(false);
    });
  });
});
