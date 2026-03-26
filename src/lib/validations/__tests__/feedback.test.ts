import { describe, it, expect } from "vitest";
import { feedbackSchema } from "../feedback";

describe("feedbackSchema", () => {
  it("accepts rating 1 without comment", () => {
    expect(feedbackSchema.safeParse({ rating: 1 }).success).toBe(true);
  });

  it("accepts rating 5 with comment", () => {
    expect(
      feedbackSchema.safeParse({ rating: 5, comment: "Great!" }).success,
    ).toBe(true);
  });

  it("rejects rating 0", () => {
    expect(feedbackSchema.safeParse({ rating: 0 }).success).toBe(false);
  });

  it("rejects rating 6", () => {
    expect(feedbackSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("rejects non-integer rating", () => {
    expect(feedbackSchema.safeParse({ rating: 3.5 }).success).toBe(false);
  });

  it("rejects comment exceeding 1000 chars", () => {
    const result = feedbackSchema.safeParse({
      rating: 3,
      comment: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from comment", () => {
    const result = feedbackSchema.safeParse({
      rating: 4,
      comment: "  nice  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment).toBe("nice");
    }
  });

  it("rejects whitespace-only comment", () => {
    const result = feedbackSchema.safeParse({ rating: 4, comment: "   " });
    expect(result.success).toBe(false);
  });
});
