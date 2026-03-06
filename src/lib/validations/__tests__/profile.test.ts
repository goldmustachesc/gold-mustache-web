import { describe, it, expect } from "vitest";
import { profileUpdateSchema } from "../profile";

describe("profileUpdateSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with just fullName", () => {
    expect(profileUpdateSchema.safeParse({ fullName: "João" }).success).toBe(
      true,
    );
  });

  it("rejects fullName exceeding 100 chars", () => {
    expect(
      profileUpdateSchema.safeParse({ fullName: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it("rejects phone exceeding 20 chars", () => {
    expect(
      profileUpdateSchema.safeParse({ phone: "1".repeat(21) }).success,
    ).toBe(false);
  });

  it("accepts valid Brazilian state", () => {
    expect(profileUpdateSchema.safeParse({ state: "SP" }).success).toBe(true);
  });

  it("accepts lowercase state (auto-uppercased)", () => {
    const result = profileUpdateSchema.safeParse({ state: "sp" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe("SP");
    }
  });

  it("rejects invalid state", () => {
    expect(profileUpdateSchema.safeParse({ state: "XX" }).success).toBe(false);
  });

  it("accepts empty string for state", () => {
    expect(profileUpdateSchema.safeParse({ state: "" }).success).toBe(true);
  });

  it("accepts valid zipCode format", () => {
    expect(
      profileUpdateSchema.safeParse({ zipCode: "01234-567" }).success,
    ).toBe(true);
  });

  it("accepts zipCode without hyphen", () => {
    expect(profileUpdateSchema.safeParse({ zipCode: "01234567" }).success).toBe(
      true,
    );
  });

  it("accepts empty zipCode", () => {
    expect(profileUpdateSchema.safeParse({ zipCode: "" }).success).toBe(true);
  });

  it("rejects invalid zipCode format", () => {
    expect(profileUpdateSchema.safeParse({ zipCode: "123" }).success).toBe(
      false,
    );
  });

  it("accepts multiple address fields together", () => {
    const result = profileUpdateSchema.safeParse({
      street: "Rua A",
      number: "100",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01001-000",
    });
    expect(result.success).toBe(true);
  });
});
