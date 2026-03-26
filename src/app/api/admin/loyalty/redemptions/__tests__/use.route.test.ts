import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

const mockValidateRedemptionCode = vi.fn();
const mockMarkRedemptionAsUsed = vi.fn();

vi.mock("@/services/loyalty/rewards.service", () => ({
  RewardsService: {
    validateRedemptionCode: (...args: unknown[]) =>
      mockValidateRedemptionCode(...args),
    markRedemptionAsUsed: (...args: unknown[]) =>
      mockMarkRedemptionAsUsed(...args),
  },
}));

import { POST } from "../use/route";

const NOW = new Date("2026-03-01T12:00:00.000Z");

function adminAuthenticated() {
  mockRequireAdmin.mockResolvedValue({
    ok: true,
    userId: "admin-user-id",
    profileId: "admin-profile-id",
    role: "ADMIN",
  });
}

function adminUnauthorized() {
  mockRequireAdmin.mockResolvedValue({
    ok: false,
    response: new Response(
      JSON.stringify({ error: "UNAUTHORIZED", message: "Não autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  } as RequireAdminResult);
}

function createRequest(body: unknown): Request {
  return { json: async () => body } as Request;
}

describe("/api/admin/loyalty/redemptions/use", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("POST", () => {
    it("should return 401/403 when not admin", async () => {
      adminUnauthorized();

      const response = await POST(createRequest({ code: "ABC123" }));

      expect(response.status).toBe(401);
    });

    it("should return 400 when body is invalid (missing code)", async () => {
      adminAuthenticated();

      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when code format is invalid", async () => {
      adminAuthenticated();

      const response = await POST(createRequest({ code: "ab" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 200 with updated redemption when successful", async () => {
      adminAuthenticated();

      const validated = {
        id: "r-1",
        code: "ABC123",
        pointsSpent: 200,
        usedAt: null,
        expiresAt: new Date("2026-04-01T00:00:00.000Z"),
        reward: { name: "Corte Grátis", type: "FREE_SERVICE" },
        loyaltyAccount: { profile: { fullName: "John Doe" } },
      };

      const updated = {
        id: "r-1",
        code: "ABC123",
        pointsSpent: 200,
        usedAt: NOW,
        expiresAt: new Date("2026-04-01T00:00:00.000Z"),
        loyaltyAccountId: "acc-1",
        rewardId: "reward-1",
        createdAt: NOW,
      };

      mockValidateRedemptionCode.mockResolvedValue(validated);
      mockMarkRedemptionAsUsed.mockResolvedValue(updated);

      const response = await POST(createRequest({ code: "ABC123" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.usedAt).toBeDefined();
      expect(mockValidateRedemptionCode).toHaveBeenCalledWith("ABC123");
      expect(mockMarkRedemptionAsUsed).toHaveBeenCalledWith("ABC123");
    });

    it("should return 400 when code has already been used", async () => {
      adminAuthenticated();

      mockValidateRedemptionCode.mockRejectedValue(
        new Error("Código de resgate já foi utilizado."),
      );

      const response = await POST(createRequest({ code: "ABC123" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("utilizado");
    });

    it("should return 400 when code is expired", async () => {
      adminAuthenticated();

      mockValidateRedemptionCode.mockRejectedValue(
        new Error("Código de resgate expirado."),
      );

      const response = await POST(createRequest({ code: "ABC123" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("expirado");
    });

    it("should return 404 when code is not found", async () => {
      adminAuthenticated();

      mockValidateRedemptionCode.mockRejectedValue(
        new Error("Código de resgate não encontrado."),
      );

      const response = await POST(createRequest({ code: "XYZ999" }));

      expect(response.status).toBe(404);
    });
  });
});
