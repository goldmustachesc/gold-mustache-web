import { describe, it, expect } from "vitest";
import { getEffectiveDuration } from "../effective-duration";

describe("getEffectiveDuration", () => {
  it("returns service duration when override is null", () => {
    expect(getEffectiveDuration(null, 30)).toBe(30);
  });

  it("returns service duration when override is undefined", () => {
    expect(getEffectiveDuration(undefined, 45)).toBe(45);
  });

  it("returns override when provided", () => {
    expect(getEffectiveDuration(50, 30)).toBe(50);
  });

  it("returns override even when less than default", () => {
    expect(getEffectiveDuration(20, 45)).toBe(20);
  });

  it("returns override equal to default (no special casing)", () => {
    expect(getEffectiveDuration(30, 30)).toBe(30);
  });

  it("minimum valid override (5 min)", () => {
    expect(getEffectiveDuration(5, 60)).toBe(5);
  });

  it("maximum valid override (240 min)", () => {
    expect(getEffectiveDuration(240, 60)).toBe(240);
  });
});
