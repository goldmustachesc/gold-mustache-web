import { describe, it, expect } from "vitest";
import { saveConsentSchema, getConsentQuerySchema } from "../consent";

describe("saveConsentSchema", () => {
  it("accepts valid booleans with UUID", () => {
    const result = saveConsentSchema.safeParse({
      analyticsConsent: true,
      marketingConsent: false,
      anonymousId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts booleans without anonymousId", () => {
    const result = saveConsentSchema.safeParse({
      analyticsConsent: false,
      marketingConsent: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null anonymousId", () => {
    const result = saveConsentSchema.safeParse({
      analyticsConsent: true,
      marketingConsent: true,
      anonymousId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid anonymousId", () => {
    const result = saveConsentSchema.safeParse({
      analyticsConsent: true,
      marketingConsent: true,
      anonymousId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean consent values", () => {
    const result = saveConsentSchema.safeParse({
      analyticsConsent: "yes",
      marketingConsent: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("getConsentQuerySchema", () => {
  it("accepts valid UUID", () => {
    const result = getConsentQuerySchema.safeParse({
      anonymousId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (optional field)", () => {
    expect(getConsentQuerySchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const result = getConsentQuerySchema.safeParse({
      anonymousId: "bad-id",
    });
    expect(result.success).toBe(false);
  });
});
