import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { LoyaltyTier, NotificationType } from "@prisma/client";

const mockCreateNotification = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    loyaltyAccount: { findUnique: vi.fn() },
  },
}));

vi.mock("@/services/notification", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

import { prisma } from "@/lib/prisma";
import { LoyaltyNotificationService } from "../notification.service";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

const MOCK_USER_ID = "user-abc-123";
const MOCK_PROFILE_ID = "prof-abc-123";
const MOCK_ACCOUNT_ID = "acc-abc-123";

function mockProfileLookup(userId: string | null = MOCK_USER_ID) {
  asMock(prisma.profile.findUnique).mockResolvedValue(
    userId ? { id: MOCK_PROFILE_ID, userId } : null,
  );
}

function mockAccountLookup(userId: string | null = MOCK_USER_ID) {
  asMock(prisma.loyaltyAccount.findUnique).mockResolvedValue(
    userId ? { id: MOCK_ACCOUNT_ID, profile: { userId } } : null,
  );
}

describe("services/loyalty/notification.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("notifyPointsEarned", () => {
    it("should create notification with type LOYALTY_POINTS_EARNED", async () => {
      mockProfileLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyPointsEarned(
        MOCK_PROFILE_ID,
        50,
        "Agendamento concluído: Corte Degradê",
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          type: NotificationType.LOYALTY_POINTS_EARNED,
          title: "Pontos creditados!",
        }),
      );
    });

    it("should include points and description in message", async () => {
      mockProfileLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyPointsEarned(
        MOCK_PROFILE_ID,
        120,
        "Agendamento concluído: Barba",
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "+120 pontos — Agendamento concluído: Barba",
        }),
      );
    });

    it("should resolve userId from profileId", async () => {
      mockProfileLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyPointsEarned(
        MOCK_PROFILE_ID,
        10,
        "test",
      );

      expect(prisma.profile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_PROFILE_ID },
        }),
      );
    });
  });

  describe("notifyTierUpgrade", () => {
    it("should create notification with type LOYALTY_TIER_UPGRADE", async () => {
      mockAccountLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyTierUpgrade(
        MOCK_ACCOUNT_ID,
        LoyaltyTier.SILVER,
        LoyaltyTier.BRONZE,
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          type: NotificationType.LOYALTY_TIER_UPGRADE,
        }),
      );
    });

    it("should include tier names in title and message", async () => {
      mockAccountLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyTierUpgrade(
        MOCK_ACCOUNT_ID,
        LoyaltyTier.GOLD,
        LoyaltyTier.SILVER,
      );

      const call = mockCreateNotification.mock.calls[0][0];
      expect(call.title).toContain("Gold");
      expect(call.message).toContain("Silver");
      expect(call.message).toContain("Gold");
    });
  });

  describe("notifyRewardRedeemed", () => {
    it("should create notification with type LOYALTY_REWARD_REDEEMED", async () => {
      mockAccountLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyRewardRedeemed(
        MOCK_ACCOUNT_ID,
        "Corte Grátis",
        "ABC123",
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          type: NotificationType.LOYALTY_REWARD_REDEEMED,
          title: "Resgate confirmado!",
        }),
      );
    });

    it("should include reward name and code in message", async () => {
      mockAccountLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyRewardRedeemed(
        MOCK_ACCOUNT_ID,
        "Cerveja Grátis",
        "XYZ789",
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Cerveja Grátis — Código: XYZ789",
        }),
      );
    });
  });

  describe("notifyPointsExpiring", () => {
    it("should create notification with type LOYALTY_POINTS_EXPIRING", async () => {
      mockProfileLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyPointsExpiring(
        MOCK_PROFILE_ID,
        200,
        new Date("2026-04-15T00:00:00Z"),
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          type: NotificationType.LOYALTY_POINTS_EXPIRING,
          title: "Pontos prestes a expirar",
        }),
      );
    });

    it("should include point count and formatted date in message", async () => {
      mockProfileLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyPointsExpiring(
        MOCK_PROFILE_ID,
        350,
        new Date(2026, 5, 20),
      );

      const call = mockCreateNotification.mock.calls[0][0];
      expect(call.message).toContain("350");
      expect(call.message).toContain("20/06/2026");
    });
  });

  describe("notifyReferralBonus", () => {
    it("should create notification with type LOYALTY_REFERRAL_BONUS", async () => {
      mockProfileLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyReferralBonus(
        MOCK_PROFILE_ID,
        150,
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          type: NotificationType.LOYALTY_REFERRAL_BONUS,
          title: "Bônus de indicação!",
          message: "+150 pontos por indicação de amigo",
        }),
      );
    });
  });

  describe("notifyBirthdayBonus", () => {
    it("should create notification with type LOYALTY_BIRTHDAY_BONUS", async () => {
      mockProfileLookup();
      mockCreateNotification.mockResolvedValue({});

      await LoyaltyNotificationService.notifyBirthdayBonus(
        MOCK_PROFILE_ID,
        100,
      );

      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: MOCK_USER_ID,
          type: NotificationType.LOYALTY_BIRTHDAY_BONUS,
          title: "Feliz aniversário!",
          message: "+100 pontos de presente de aniversário",
        }),
      );
    });
  });

  describe("resilience (fire-and-forget)", () => {
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should not throw when createNotification rejects", async () => {
      mockProfileLookup();
      mockCreateNotification.mockRejectedValue(new Error("DB error"));

      await expect(
        LoyaltyNotificationService.notifyPointsEarned(
          MOCK_PROFILE_ID,
          50,
          "test",
        ),
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should not throw when userId resolution fails", async () => {
      asMock(prisma.profile.findUnique).mockRejectedValue(
        new Error("Connection error"),
      );

      await expect(
        LoyaltyNotificationService.notifyPointsEarned(
          MOCK_PROFILE_ID,
          50,
          "test",
        ),
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should silently return when profile not found (no userId)", async () => {
      mockProfileLookup(null);

      await LoyaltyNotificationService.notifyPointsEarned(
        MOCK_PROFILE_ID,
        50,
        "test",
      );

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should silently return when account not found (no userId)", async () => {
      mockAccountLookup(null);

      await LoyaltyNotificationService.notifyTierUpgrade(
        MOCK_ACCOUNT_ID,
        LoyaltyTier.SILVER,
        LoyaltyTier.BRONZE,
      );

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });
});
