import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockGetUser = vi.fn();
const mockIsFeatureEnabled = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock("@/services/feature-flags", () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

const mockValidateReferralCode = vi.fn();

vi.mock("@/services/loyalty/referral.service", () => ({
  ReferralService: {
    validateReferralCode: (...args: unknown[]) =>
      mockValidateReferralCode(...args),
    getPartialName: () => "João S.",
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    loyaltyAccount: { findUnique: vi.fn() },
  },
}));

vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: {
    getOrCreateAccount: vi.fn(),
  },
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";

const NOW = new Date("2026-03-01T12:00:00.000Z");

function authenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
}

function unauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
  });
}

function mockProfile(profileId = "profile-1") {
  vi.mocked(prisma.profile.findUnique).mockResolvedValue({
    id: profileId,
  } as never);
}

function mockAccount(accountId = "acc-1") {
  vi.mocked(LoyaltyService.getOrCreateAccount).mockResolvedValue({
    id: accountId,
    profileId: "profile-1",
    currentPoints: 500,
    lifetimePoints: 1000,
    tier: "BRONZE",
    referralCode: "MYCODE",
    referredById: null,
    tierUpdatedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  } as never);
}

function createRequest(body: unknown): Request {
  return { json: async () => body } as Request;
}

describe("/api/loyalty/referral/validate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    mockIsFeatureEnabled.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("POST", () => {
    it("should return 404 when loyaltyProgram flag is disabled (authenticated user)", async () => {
      mockIsFeatureEnabled.mockImplementation((key: string) =>
        Promise.resolve(key !== "loyaltyProgram"),
      );

      const response = await POST(createRequest({ code: "REF123" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NOT_FOUND");
    });

    it("should return 404 when referralProgram flag is disabled (authenticated user)", async () => {
      mockIsFeatureEnabled.mockImplementation((key: string) =>
        Promise.resolve(key !== "referralProgram"),
      );

      const response = await POST(createRequest({ code: "REF123" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NOT_FOUND");
    });

    it("should return 401 when not authenticated", async () => {
      unauthenticatedUser();

      const response = await POST(createRequest({ code: "REF123" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("UNAUTHORIZED");
    });

    it("should return 400 when body is invalid (missing code)", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("VALIDATION_ERROR");
    });

    it("should return 200 with valid: true and partial referrer name on success", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      const referrerAccount = {
        id: "acc-referrer",
        profileId: "prof-referrer",
        referralCode: "REF123",
        profile: { fullName: "João Silva" },
      };

      mockValidateReferralCode.mockResolvedValue(referrerAccount);

      const response = await POST(createRequest({ code: "REF123" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toMatchObject({
        valid: true,
        referrerName: "João S.",
      });
    });

    it("should return 400 when code is the user's own (self-referral)", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      mockValidateReferralCode.mockRejectedValue(
        new Error("Você não pode usar seu próprio código de indicação"),
      );

      const response = await POST(createRequest({ code: "MYCODE" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("próprio código");
    });

    it("should return 404 when code does not exist", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount();

      mockValidateReferralCode.mockRejectedValue(
        new Error("Código de indicação não encontrado"),
      );

      const response = await POST(createRequest({ code: "NOPE00" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toContain("não encontrado");
    });

    it("should call validateReferralCode with correct code and account ID", async () => {
      authenticatedUser();
      mockProfile();
      mockAccount("acc-current");

      mockValidateReferralCode.mockResolvedValue({
        id: "acc-referrer",
        profile: { fullName: "Maria Santos" },
      });

      await POST(createRequest({ code: "XYZ789" }));

      expect(mockValidateReferralCode).toHaveBeenCalledWith(
        "XYZ789",
        "acc-current",
      );
    });
  });
});
