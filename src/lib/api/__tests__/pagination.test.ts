import { describe, it, expect } from "vitest";
import { parsePagination, paginationMeta } from "../pagination";

describe("parsePagination", () => {
  it("returns defaults when no params provided", () => {
    const result = parsePagination(new URLSearchParams());
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("parses valid page and limit", () => {
    const result = parsePagination(new URLSearchParams("page=3&limit=10"));
    expect(result).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it("clamps page to minimum 1", () => {
    const result = parsePagination(new URLSearchParams("page=0"));
    expect(result.page).toBe(1);

    const negative = parsePagination(new URLSearchParams("page=-5"));
    expect(negative.page).toBe(1);
  });

  it("uses default limit when value is 0 (falsy)", () => {
    const result = parsePagination(new URLSearchParams("limit=0"));
    expect(result.limit).toBe(20);
  });

  it("clamps limit to minimum 1 for negative values", () => {
    const result = parsePagination(new URLSearchParams("limit=-5"));
    expect(result.limit).toBe(1);
  });

  it("clamps limit to maximum 100", () => {
    const result = parsePagination(new URLSearchParams("limit=500"));
    expect(result.limit).toBe(100);
  });

  it("computes skip correctly for page 2 with limit 25", () => {
    const result = parsePagination(new URLSearchParams("page=2&limit=25"));
    expect(result.skip).toBe(25);
  });

  it("handles non-numeric values as defaults", () => {
    const result = parsePagination(new URLSearchParams("page=abc&limit=xyz"));
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });
});

describe("paginationMeta", () => {
  it("calculates totalPages correctly", () => {
    expect(paginationMeta(50, 1, 10)).toEqual({
      total: 50,
      page: 1,
      limit: 10,
      totalPages: 5,
    });
  });

  it("rounds up totalPages for partial last page", () => {
    expect(paginationMeta(51, 1, 10).totalPages).toBe(6);
  });

  it("returns totalPages 0 when total is 0", () => {
    expect(paginationMeta(0, 1, 20).totalPages).toBe(0);
  });

  it("returns totalPages 1 when total equals limit", () => {
    expect(paginationMeta(20, 1, 20).totalPages).toBe(1);
  });
});
