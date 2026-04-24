import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import * as fc from "fast-check";
import { PointTransactionType } from "@prisma/client";
import { LOYALTY_CONFIG } from "@/config/loyalty.config";

const mockCreditPoints = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => {
  const prisma = {
    profile: { findMany: vi.fn() },
    pointTransaction: { findFirst: vi.fn(), findMany: vi.fn() },
  };
  return { prisma };
});

vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: {
    creditPoints: mockCreditPoints,
  },
}));

vi.mock("@/services/loyalty/notification.service", () => ({
  LoyaltyNotificationService: {
    notifyBirthdayBonus: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { BirthdayService } from "../birthday.service";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

const NOW = new Date("2026-03-15T12:00:00.000Z");

function createMockProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    userId: "user-1",
    fullName: "John Doe",
    birthDate: new Date("1990-03-15"),
    loyaltyAccount: {
      id: "acc-1",
      profileId: "profile-1",
      currentPoints: 200,
      lifetimePoints: 500,
      tier: "BRONZE",
      referralCode: "ABC123",
    },
    ...overrides,
  };
}

describe("services/loyalty/birthday.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("getTodayBirthdays", () => {
    it("should return profiles whose birthDate matches month and day of the given date", async () => {
      const matchingProfile = createMockProfile({
        id: "profile-1",
        birthDate: new Date("1990-03-15"),
      });
      const nonMatchingProfile = createMockProfile({
        id: "profile-2",
        birthDate: new Date("1990-07-20"),
      });

      asMock(prisma.profile.findMany).mockResolvedValue([
        matchingProfile,
        nonMatchingProfile,
      ]);

      const result = await BirthdayService.getTodayBirthdays(NOW);

      expect(result).toEqual([matchingProfile]);
    });

    it("should ignore profiles without birthDate", async () => {
      const withBirthDate = createMockProfile({
        id: "profile-1",
        birthDate: new Date("1990-03-15"),
      });
      const withoutBirthDate = createMockProfile({
        id: "profile-2",
        birthDate: null,
        loyaltyAccount: {
          id: "acc-2",
          profileId: "profile-2",
          currentPoints: 100,
          lifetimePoints: 100,
          tier: "BRONZE",
          referralCode: "DEF456",
        },
      });

      asMock(prisma.profile.findMany).mockResolvedValue([
        withBirthDate,
        withoutBirthDate,
      ]);

      const result = await BirthdayService.getTodayBirthdays(NOW);

      expect(result).toEqual([withBirthDate]);
    });

    it("should ignore profiles without LoyaltyAccount", async () => {
      asMock(prisma.profile.findMany).mockResolvedValue([
        createMockProfile({ id: "profile-1", loyaltyAccount: null }),
      ]);

      const result = await BirthdayService.getTodayBirthdays(NOW);

      expect(result).toEqual([]);
    });

    it("should return empty array when no birthdays match", async () => {
      asMock(prisma.profile.findMany).mockResolvedValue([]);

      const result = await BirthdayService.getTodayBirthdays(NOW);

      expect(result).toEqual([]);
    });
  });

  describe("hasBirthdayBonusThisYear", () => {
    it("should return true when EARNED_BIRTHDAY transaction exists for the given year", async () => {
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([
        {
          loyaltyAccountId: "acc-1",
        },
      ]);

      const result = await BirthdayService.hasBirthdayBonusThisYear(
        "acc-1",
        2026,
      );

      expect(result).toBe(true);
      expect(prisma.pointTransaction.findMany).toHaveBeenCalledWith({
        where: {
          loyaltyAccountId: { in: ["acc-1"] },
          type: PointTransactionType.EARNED_BIRTHDAY,
          referenceId: "birthday-2026",
        },
        select: {
          loyaltyAccountId: true,
        },
      });
    });

    it("should return false when no EARNED_BIRTHDAY transaction exists", async () => {
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);

      const result = await BirthdayService.hasBirthdayBonusThisYear(
        "acc-1",
        2026,
      );

      expect(result).toBe(false);
    });

    it("should distinguish between different years (2025 bonus does not block 2026)", async () => {
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);

      const result = await BirthdayService.hasBirthdayBonusThisYear(
        "acc-1",
        2026,
      );

      expect(result).toBe(false);
      expect(prisma.pointTransaction.findMany).toHaveBeenCalledWith({
        where: {
          loyaltyAccountId: { in: ["acc-1"] },
          type: PointTransactionType.EARNED_BIRTHDAY,
          referenceId: "birthday-2026",
        },
        select: {
          loyaltyAccountId: true,
        },
      });
    });
  });

  describe("getBirthdayBonusAccountIdsForYear", () => {
    it("should return the set of credited account ids using the same criteria", async () => {
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([
        { loyaltyAccountId: "acc-1" },
        { loyaltyAccountId: "acc-2" },
      ]);

      const result = await BirthdayService.getBirthdayBonusAccountIdsForYear(
        ["acc-1", "acc-2", "acc-3"],
        2026,
      );

      expect(result.has("acc-1")).toBe(true);
      expect(result.has("acc-2")).toBe(true);
      expect(result.has("acc-3")).toBe(false);
      expect(prisma.pointTransaction.findMany).toHaveBeenCalledWith({
        where: {
          loyaltyAccountId: { in: ["acc-1", "acc-2", "acc-3"] },
          type: PointTransactionType.EARNED_BIRTHDAY,
          referenceId: "birthday-2026",
        },
        select: {
          loyaltyAccountId: true,
        },
      });
    });
  });

  describe("creditBirthdayBonuses", () => {
    function setupEligibleBirthday() {
      const profile = createMockProfile({
        id: "profile-1",
        birthDate: new Date("1990-03-15"),
      });
      asMock(prisma.profile.findMany).mockResolvedValue([profile]);
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);
      mockCreditPoints.mockResolvedValue(undefined);
      return profile;
    }

    it("should credit BIRTHDAY_BONUS points for each eligible birthday", async () => {
      const profile = setupEligibleBirthday();

      await BirthdayService.creditBirthdayBonuses(NOW);

      expect(mockCreditPoints).toHaveBeenCalledWith({
        accountId: profile.loyaltyAccount.id,
        type: PointTransactionType.EARNED_BIRTHDAY,
        points: LOYALTY_CONFIG.BIRTHDAY_BONUS,
        description: expect.any(String),
        referenceId: "birthday-2026",
      });

      const { LoyaltyNotificationService } = await import(
        "../notification.service"
      );
      expect(
        LoyaltyNotificationService.notifyBirthdayBonus,
      ).toHaveBeenCalledWith(profile.id, LOYALTY_CONFIG.BIRTHDAY_BONUS);
    });

    it("should create PointTransaction with type EARNED_BIRTHDAY", async () => {
      setupEligibleBirthday();

      await BirthdayService.creditBirthdayBonuses(NOW);

      expect(mockCreditPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PointTransactionType.EARNED_BIRTHDAY,
        }),
      );
    });

    it("should use referenceId birthday-{year} as duplicate guard", async () => {
      setupEligibleBirthday();

      await BirthdayService.creditBirthdayBonuses(NOW);

      expect(mockCreditPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceId: "birthday-2026",
        }),
      );
    });

    it("should NOT credit if the account already received bonus this year", async () => {
      const profile = createMockProfile({
        id: "profile-1",
        birthDate: new Date("1990-03-15"),
      });
      asMock(prisma.profile.findMany).mockResolvedValue([profile]);
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([
        { loyaltyAccountId: "acc-1" },
      ]);

      const result = await BirthdayService.creditBirthdayBonuses(NOW);

      expect(mockCreditPoints).not.toHaveBeenCalled();
      expect(result.processedCount).toBe(0);
    });

    it("should recalculate tier after credit (delegated via LoyaltyService.creditPoints)", async () => {
      setupEligibleBirthday();

      await BirthdayService.creditBirthdayBonuses(NOW);

      expect(mockCreditPoints).toHaveBeenCalledTimes(1);
    });

    it("should return summary with processedCount and totalPointsCredited", async () => {
      const profile1 = createMockProfile({
        id: "profile-1",
        birthDate: new Date("1990-03-15"),
        loyaltyAccount: {
          id: "acc-1",
          profileId: "profile-1",
          currentPoints: 200,
          lifetimePoints: 500,
          tier: "BRONZE",
          referralCode: "ABC123",
        },
      });
      const profile2 = createMockProfile({
        id: "profile-2",
        birthDate: new Date("1985-03-15"),
        loyaltyAccount: {
          id: "acc-2",
          profileId: "profile-2",
          currentPoints: 300,
          lifetimePoints: 800,
          tier: "SILVER",
          referralCode: "XYZ789",
        },
      });

      asMock(prisma.profile.findMany).mockResolvedValue([profile1, profile2]);
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);
      mockCreditPoints.mockResolvedValue(undefined);

      const result = await BirthdayService.creditBirthdayBonuses(NOW);

      expect(result).toEqual({
        processedCount: 2,
        totalPointsCredited: 2 * LOYALTY_CONFIG.BIRTHDAY_BONUS,
        failedCount: 0,
      });
    });

    it("should do nothing when there are no birthdays today", async () => {
      asMock(prisma.profile.findMany).mockResolvedValue([]);

      const result = await BirthdayService.creditBirthdayBonuses(NOW);

      expect(result).toEqual({
        processedCount: 0,
        totalPointsCredited: 0,
        failedCount: 0,
      });
      expect(mockCreditPoints).not.toHaveBeenCalled();
    });

    it("should continue processing remaining birthdays when creditPoints throws for one", async () => {
      const profile1 = createMockProfile({
        id: "profile-1",
        birthDate: new Date("1990-03-15"),
        loyaltyAccount: {
          id: "acc-1",
          profileId: "profile-1",
          currentPoints: 200,
          lifetimePoints: 500,
          tier: "BRONZE",
          referralCode: "ABC123",
        },
      });
      const profile2 = createMockProfile({
        id: "profile-2",
        birthDate: new Date("1985-03-15"),
        loyaltyAccount: {
          id: "acc-2",
          profileId: "profile-2",
          currentPoints: 300,
          lifetimePoints: 800,
          tier: "SILVER",
          referralCode: "XYZ789",
        },
      });

      asMock(prisma.profile.findMany).mockResolvedValue([profile1, profile2]);
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);
      mockCreditPoints
        .mockRejectedValueOnce(new Error("DB connection lost"))
        .mockResolvedValueOnce(undefined);

      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await BirthdayService.creditBirthdayBonuses(NOW);

      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(mockCreditPoints).toHaveBeenCalledTimes(2);
    });

    it("should return failedCount in the summary", async () => {
      const profile1 = createMockProfile({
        id: "profile-1",
        birthDate: new Date("1990-03-15"),
        loyaltyAccount: {
          id: "acc-1",
          profileId: "profile-1",
          currentPoints: 200,
          lifetimePoints: 500,
          tier: "BRONZE",
          referralCode: "ABC123",
        },
      });
      const profile2 = createMockProfile({
        id: "profile-2",
        birthDate: new Date("1985-03-15"),
        loyaltyAccount: {
          id: "acc-2",
          profileId: "profile-2",
          currentPoints: 300,
          lifetimePoints: 800,
          tier: "SILVER",
          referralCode: "XYZ789",
        },
      });

      asMock(prisma.profile.findMany).mockResolvedValue([profile1, profile2]);
      asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);
      mockCreditPoints
        .mockRejectedValueOnce(new Error("DB connection lost"))
        .mockResolvedValueOnce(undefined);

      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await BirthdayService.creditBirthdayBonuses(NOW);

      expect(result).toEqual({
        processedCount: 1,
        totalPointsCredited: LOYALTY_CONFIG.BIRTHDAY_BONUS,
        failedCount: 1,
      });
    });
  });

  describe("property tests", () => {
    it("totalPointsCredited should always equal processedCount * BIRTHDAY_BONUS", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          async (eligibleCount) => {
            vi.resetAllMocks();

            const profiles = Array.from({ length: eligibleCount }, (_, i) =>
              createMockProfile({
                id: `profile-${i}`,
                birthDate: new Date("1990-03-15"),
                loyaltyAccount: {
                  id: `acc-${i}`,
                  profileId: `profile-${i}`,
                  currentPoints: 100,
                  lifetimePoints: 100,
                  tier: "BRONZE",
                  referralCode: `REF${i}`,
                },
              }),
            );

            asMock(prisma.profile.findMany).mockResolvedValue(profiles);
            asMock(prisma.pointTransaction.findMany).mockResolvedValue([]);
            mockCreditPoints.mockResolvedValue(undefined);

            const result = await BirthdayService.creditBirthdayBonuses(NOW);

            expect(result.processedCount).toBe(eligibleCount);
            expect(result.totalPointsCredited).toBe(
              result.processedCount * LOYALTY_CONFIG.BIRTHDAY_BONUS,
            );
            expect(result.failedCount).toBe(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
