import { describe, it, expect } from "vitest";
import {
  accountIdSchema,
  loyaltyAdjustSchema,
  redeemRewardSchema,
  redemptionCodeSchema,
  referralCodeSchema,
} from "../loyalty";

describe("accountIdSchema", () => {
  it("accepts a valid UUID", () => {
    expect(
      accountIdSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success,
    ).toBe(true);
  });

  it("rejects an invalid UUID", () => {
    expect(accountIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("loyaltyAdjustSchema", () => {
  it("accepts valid points and reason", () => {
    const result = loyaltyAdjustSchema.safeParse({
      points: 100,
      reason: "Bonus",
    });
    expect(result.success).toBe(true);
  });

  it("accepts negative points", () => {
    const result = loyaltyAdjustSchema.safeParse({
      points: -50,
      reason: "Penalty",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero points", () => {
    const result = loyaltyAdjustSchema.safeParse({
      points: 0,
      reason: "None",
    });
    expect(result.success).toBe(false);
  });

  it("rejects points above 10000", () => {
    const result = loyaltyAdjustSchema.safeParse({
      points: 10001,
      reason: "Too much",
    });
    expect(result.success).toBe(false);
  });

  it("rejects points below -10000", () => {
    const result = loyaltyAdjustSchema.safeParse({
      points: -10001,
      reason: "Too low",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty reason", () => {
    const result = loyaltyAdjustSchema.safeParse({ points: 10, reason: "" });
    expect(result.success).toBe(false);
  });

  it("rejects reason exceeding 500 chars", () => {
    const result = loyaltyAdjustSchema.safeParse({
      points: 10,
      reason: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("redeemRewardSchema", () => {
  it("accepts valid rewardId UUID", () => {
    const result = redeemRewardSchema.safeParse({
      rewardId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid rewardId", () => {
    const result = redeemRewardSchema.safeParse({ rewardId: "bad" });
    expect(result.success).toBe(false);
  });
});

describe("redemptionCodeSchema", () => {
  it("accepts a valid 6-char uppercase alphanumeric code", () => {
    expect(redemptionCodeSchema.safeParse("ABC123").success).toBe(true);
  });

  it("rejects codes shorter than 6 chars", () => {
    expect(redemptionCodeSchema.safeParse("AB12").success).toBe(false);
  });

  it("rejects codes longer than 6 chars", () => {
    expect(redemptionCodeSchema.safeParse("ABCDEFG").success).toBe(false);
  });

  it("rejects lowercase characters", () => {
    expect(redemptionCodeSchema.safeParse("abc123").success).toBe(false);
  });

  it("rejects special characters", () => {
    expect(redemptionCodeSchema.safeParse("ABC-12").success).toBe(false);
  });
});

describe("referralCodeSchema", () => {
  it("accepts valid referral code object", () => {
    const result = referralCodeSchema.safeParse({ code: "XYZ789" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid code format", () => {
    const result = referralCodeSchema.safeParse({ code: "short" });
    expect(result.success).toBe(false);
  });
});
