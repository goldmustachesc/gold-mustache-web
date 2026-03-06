import { describe, it, expect } from "vitest";
import {
  generateSlug,
  createAdminServiceSchema,
  updateAdminServiceSchema,
  SERVICE_CONSTRAINTS,
} from "../service";

describe("generateSlug", () => {
  it("converts to lowercase and replaces spaces with hyphens", () => {
    expect(generateSlug("Corte Masculino")).toBe("corte-masculino");
  });

  it("removes accents", () => {
    expect(generateSlug("Barba Estilização")).toBe("barba-estilizacao");
  });

  it("removes special characters and collapses resulting hyphens", () => {
    expect(generateSlug("Corte & Barba!")).toBe("corte-barba");
  });

  it("collapses multiple hyphens", () => {
    expect(generateSlug("Corte---Barba")).toBe("corte-barba");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateSlug("-Corte-")).toBe("corte");
  });

  it("falls back to 'servico' for empty result", () => {
    expect(generateSlug("!!!")).toBe("servico");
    expect(generateSlug("")).toBe("servico");
  });
});

describe("createAdminServiceSchema", () => {
  const validInput = { name: "Corte", duration: 30, price: 50 };

  it("accepts valid input", () => {
    expect(createAdminServiceSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects name shorter than minimum", () => {
    const result = createAdminServiceSchema.safeParse({
      ...validInput,
      name: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than maximum", () => {
    const result = createAdminServiceSchema.safeParse({
      ...validInput,
      name: "a".repeat(SERVICE_CONSTRAINTS.NAME_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration not a multiple of 15", () => {
    const result = createAdminServiceSchema.safeParse({
      ...validInput,
      duration: 20,
    });
    expect(result.success).toBe(false);
  });

  it("accepts duration that is a multiple of 15", () => {
    expect(
      createAdminServiceSchema.safeParse({ ...validInput, duration: 45 })
        .success,
    ).toBe(true);
  });

  it("rejects duration below minimum", () => {
    const result = createAdminServiceSchema.safeParse({
      ...validInput,
      duration: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration above maximum", () => {
    const result = createAdminServiceSchema.safeParse({
      ...validInput,
      duration: 195,
    });
    expect(result.success).toBe(false);
  });

  it("rejects price below minimum", () => {
    const result = createAdminServiceSchema.safeParse({
      ...validInput,
      price: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects price above maximum", () => {
    const result = createAdminServiceSchema.safeParse({
      ...validInput,
      price: 10001,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional nullable description", () => {
    const result = createAdminServiceSchema.safeParse({
      ...validInput,
      description: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateAdminServiceSchema", () => {
  it("accepts partial update with just name", () => {
    expect(
      updateAdminServiceSchema.safeParse({ name: "Updated" }).success,
    ).toBe(true);
  });

  it("accepts partial update with just active", () => {
    expect(updateAdminServiceSchema.safeParse({ active: false }).success).toBe(
      true,
    );
  });

  it("rejects empty object (no fields provided)", () => {
    expect(updateAdminServiceSchema.safeParse({}).success).toBe(false);
  });

  it("accepts all fields at once", () => {
    const result = updateAdminServiceSchema.safeParse({
      name: "Corte Premium",
      duration: 60,
      price: 80,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates individual field constraints", () => {
    const result = updateAdminServiceSchema.safeParse({ name: "ab" });
    expect(result.success).toBe(false);
  });
});
