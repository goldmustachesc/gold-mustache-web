import { describe, it, expect } from "vitest";
import { isPublicApiRoute } from "../public-routes";

describe("isPublicApiRoute", () => {
  describe("public routes (should return true)", () => {
    it.each(["/api/barbers", "/api/services", "/api/slots"])(
      "returns true for exact public route %s",
      (pathname) => {
        expect(isPublicApiRoute(pathname)).toBe(true);
      },
    );

    it.each([
      "/api/instagram/posts",
      "/api/consent",
      "/api/cron/sync-instagram",
      "/api/cron/cleanup-guests",
    ])("returns true for public prefix route %s", (pathname) => {
      expect(isPublicApiRoute(pathname)).toBe(true);
    });
  });

  describe("protected barber routes (should return false)", () => {
    it.each([
      "/api/barbers/me",
      "/api/barbers/me/clients",
      "/api/barbers/me/appointments",
      "/api/barbers/me/working-hours",
      "/api/barbers/me/absences",
      "/api/barbers/me/feedbacks",
      "/api/barbers/me/financial",
    ])("returns false for protected route %s", (pathname) => {
      expect(isPublicApiRoute(pathname)).toBe(false);
    });
  });

  describe("other non-public routes (should return false)", () => {
    it.each([
      "/api/appointments",
      "/api/dashboard/stats",
      "/api/admin/barbers",
      "/api/admin/services",
      "/api/notifications",
      "/api/profile/me",
      "/api/loyalty/account",
    ])("returns false for non-public route %s", (pathname) => {
      expect(isPublicApiRoute(pathname)).toBe(false);
    });
  });
});
