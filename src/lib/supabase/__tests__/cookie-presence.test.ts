import { describe, expect, it } from "vitest";
import { hasSupabaseAuthCookieName } from "../cookie-presence";

describe("hasSupabaseAuthCookieName", () => {
  it("returns false for empty list", () => {
    expect(hasSupabaseAuthCookieName([])).toBe(false);
  });

  it("returns false when no sb-*-auth-token cookie present", () => {
    expect(hasSupabaseAuthCookieName(["foo", "baz"])).toBe(false);
  });

  it("detects sb-<ref>-auth-token", () => {
    expect(hasSupabaseAuthCookieName(["foo", "sb-projectref-auth-token"])).toBe(
      true,
    );
  });

  it("detects chunked sb-<ref>-auth-token.0", () => {
    expect(hasSupabaseAuthCookieName(["sb-projectref-auth-token.0"])).toBe(
      true,
    );
  });

  it("does not match unrelated sb- prefixed cookies", () => {
    expect(
      hasSupabaseAuthCookieName(["sb-other-thing", "sb-x-auth-tokenized"]),
    ).toBe(false);
  });
});
