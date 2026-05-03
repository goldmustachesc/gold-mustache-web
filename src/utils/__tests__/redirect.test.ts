import { describe, it, expect } from "vitest";
import { getSafeRedirectPath } from "../redirect";

describe("utils/redirect", () => {
  describe("getSafeRedirectPath", () => {
    it("returns /dashboard for null input", () => {
      expect(getSafeRedirectPath(null)).toBe("/dashboard");
    });

    it("returns /dashboard for empty string", () => {
      expect(getSafeRedirectPath("")).toBe("/dashboard");
    });

    it("passes through a valid relative path", () => {
      expect(getSafeRedirectPath("/dashboard")).toBe("/dashboard");
    });

    it("passes through nested relative paths", () => {
      expect(getSafeRedirectPath("/pt-BR/dashboard")).toBe("/pt-BR/dashboard");
    });

    it("passes through paths with query strings", () => {
      expect(getSafeRedirectPath("/dashboard?tab=overview")).toBe(
        "/dashboard?tab=overview",
      );
    });

    it("rejects protocol-relative URLs (//evil.com)", () => {
      expect(getSafeRedirectPath("//evil.com")).toBe("/dashboard");
    });

    it("rejects absolute URLs (https://evil.com)", () => {
      expect(getSafeRedirectPath("https://evil.com")).toBe("/dashboard");
    });

    it("rejects paths without leading slash", () => {
      expect(getSafeRedirectPath("evil.com")).toBe("/dashboard");
    });

    it("rejects backslash-based bypasses (/\\evil.com)", () => {
      expect(getSafeRedirectPath("/\\evil.com")).toBe("/dashboard");
    });

    it("rejects control characters (CRLF header injection)", () => {
      expect(getSafeRedirectPath("/path\r\nLocation: http://evil.com")).toBe(
        "/dashboard",
      );
    });

    it("rejects null bytes", () => {
      expect(getSafeRedirectPath("/path\x00")).toBe("/dashboard");
    });

    it("rejects double-encoded protocol-relative URLs (%2F%2Fevil.com)", () => {
      expect(getSafeRedirectPath("%2F%2Fevil.com")).toBe("/dashboard");
    });

    it("rejects double-encoded backslash (%5Cevil.com)", () => {
      expect(getSafeRedirectPath("/%5Cevil.com")).toBe("/dashboard");
    });

    it("returns /dashboard for malformed percent-encoding", () => {
      expect(getSafeRedirectPath("/%ZZ")).toBe("/dashboard");
    });

    it("supports a custom fallback path", () => {
      expect(getSafeRedirectPath("https://evil.com", "/pt-BR/dashboard")).toBe(
        "/pt-BR/dashboard",
      );
    });
  });
});
