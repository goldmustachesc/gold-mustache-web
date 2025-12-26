import { describe, it, expect } from "vitest";
import { normalizePhoneDigits } from "../phone";

describe("lib/booking/phone", () => {
  it("normalizePhoneDigits strips all non-digits", () => {
    expect(normalizePhoneDigits("(11) 99999-8888")).toBe("11999998888");
    expect(normalizePhoneDigits("+55 (11) 99999-8888")).toBe("5511999998888");
    expect(normalizePhoneDigits("11 99999 8888")).toBe("11999998888");
    expect(normalizePhoneDigits("")).toBe("");
  });
});
