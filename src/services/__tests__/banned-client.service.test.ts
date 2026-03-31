import { describe, it, expect, vi, afterEach } from "vitest";
import type { MockInstance } from "vitest";

const mockGetTodayUTCMidnight = vi.fn();
vi.mock("@/utils/time-slots", () => ({
  getTodayUTCMidnight: () => mockGetTodayUTCMidnight(),
}));

vi.mock("@/lib/prisma", () => {
  const prisma = {
    bannedClient: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    profile: { findUnique: vi.fn() },
    guestClient: { findUnique: vi.fn() },
    appointment: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

import { prisma } from "@/lib/prisma";
import {
  banClient,
  unbanClient,
  isClientBanned,
  getBannedClients,
  migrateGuestBanToProfile,
} from "../banned-client";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

describe("services/banned-client", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("banClient", () => {
    it("bans a registered client (profile) and cancels future appointments using UTC midnight", async () => {
      const todayMidnight = new Date("2025-06-15T00:00:00Z");
      mockGetTodayUTCMidnight.mockReturnValue(todayMidnight);

      asMock(prisma.profile.findUnique).mockResolvedValue({
        id: "profile-1",
        fullName: "Carlos Silva",
      });

      asMock(prisma.bannedClient.findFirst).mockResolvedValue(null);

      const createdBan = {
        id: "ban-1",
        profileId: "profile-1",
        guestClientId: null,
        reason: "Comportamento inadequado",
        bannedBy: "barber-1",
        createdAt: todayMidnight,
      };

      const mockUpdateMany = vi.fn().mockResolvedValue({ count: 2 });

      asMock(prisma.$transaction).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            bannedClient: { create: vi.fn().mockResolvedValue(createdBan) },
            appointment: { updateMany: mockUpdateMany },
          };
          return fn(tx);
        },
      );

      const result = await banClient({
        clientId: "profile-1",
        clientType: "registered",
        reason: "Comportamento inadequado",
        bannedByBarberId: "barber-1",
      });

      expect(result).toEqual(createdBan);
      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { id: "profile-1" },
        select: { id: true },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          clientId: "profile-1",
          status: "CONFIRMED",
          date: { gte: todayMidnight },
        },
        data: {
          status: "CANCELLED_BY_BARBER",
          cancelReason: "Cliente banido",
        },
      });
    });

    it("bans a guest client and cancels future appointments using UTC midnight", async () => {
      const todayMidnight = new Date("2025-06-15T00:00:00Z");
      mockGetTodayUTCMidnight.mockReturnValue(todayMidnight);

      asMock(prisma.guestClient.findUnique).mockResolvedValue({
        id: "guest-1",
        fullName: "João Convidado",
      });

      asMock(prisma.bannedClient.findFirst).mockResolvedValue(null);

      const createdBan = {
        id: "ban-2",
        profileId: null,
        guestClientId: "guest-1",
        reason: null,
        bannedBy: "barber-1",
        createdAt: todayMidnight,
      };

      const mockUpdateMany = vi.fn().mockResolvedValue({ count: 0 });

      asMock(prisma.$transaction).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            bannedClient: { create: vi.fn().mockResolvedValue(createdBan) },
            appointment: { updateMany: mockUpdateMany },
          };
          return fn(tx);
        },
      );

      const result = await banClient({
        clientId: "guest-1",
        clientType: "guest",
        bannedByBarberId: "barber-1",
      });

      expect(result).toEqual(createdBan);
      expect(prisma.guestClient.findUnique).toHaveBeenCalledWith({
        where: { id: "guest-1" },
        select: { id: true },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          guestClientId: "guest-1",
          status: "CONFIRMED",
          date: { gte: todayMidnight },
        },
        data: {
          status: "CANCELLED_BY_BARBER",
          cancelReason: "Cliente banido",
        },
      });
    });

    it("throws CLIENT_NOT_FOUND when profile does not exist", async () => {
      asMock(prisma.profile.findUnique).mockResolvedValue(null);

      await expect(
        banClient({
          clientId: "non-existent",
          clientType: "registered",
          bannedByBarberId: "barber-1",
        }),
      ).rejects.toThrow("CLIENT_NOT_FOUND");
    });

    it("throws CLIENT_NOT_FOUND when guest client does not exist", async () => {
      asMock(prisma.guestClient.findUnique).mockResolvedValue(null);

      await expect(
        banClient({
          clientId: "non-existent",
          clientType: "guest",
          bannedByBarberId: "barber-1",
        }),
      ).rejects.toThrow("CLIENT_NOT_FOUND");
    });

    it("throws CLIENT_ALREADY_BANNED when client is already banned", async () => {
      asMock(prisma.profile.findUnique).mockResolvedValue({
        id: "profile-1",
      });

      asMock(prisma.bannedClient.findFirst).mockResolvedValue({
        id: "ban-existing",
        profileId: "profile-1",
      });

      await expect(
        banClient({
          clientId: "profile-1",
          clientType: "registered",
          bannedByBarberId: "barber-1",
        }),
      ).rejects.toThrow("CLIENT_ALREADY_BANNED");
    });
  });

  describe("unbanClient", () => {
    it("removes the ban record", async () => {
      asMock(prisma.bannedClient.findUnique).mockResolvedValue({
        id: "ban-1",
        profileId: "profile-1",
        guestClientId: null,
      });

      asMock(prisma.bannedClient.delete).mockResolvedValue({ id: "ban-1" });

      await unbanClient("ban-1");

      expect(prisma.bannedClient.delete).toHaveBeenCalledWith({
        where: { id: "ban-1" },
      });
    });

    it("throws BAN_NOT_FOUND when ban record does not exist", async () => {
      asMock(prisma.bannedClient.findUnique).mockResolvedValue(null);

      await expect(unbanClient("non-existent")).rejects.toThrow(
        "BAN_NOT_FOUND",
      );
    });
  });

  describe("isClientBanned", () => {
    it("returns true when registered client is banned", async () => {
      asMock(prisma.bannedClient.findFirst).mockResolvedValue({
        id: "ban-1",
        profileId: "profile-1",
      });

      const result = await isClientBanned({ profileId: "profile-1" });
      expect(result).toBe(true);

      expect(prisma.bannedClient.findFirst).toHaveBeenCalledWith({
        where: { profileId: "profile-1" },
        select: { id: true },
      });
    });

    it("returns true when guest client is banned", async () => {
      asMock(prisma.bannedClient.findFirst).mockResolvedValue({
        id: "ban-2",
        guestClientId: "guest-1",
      });

      const result = await isClientBanned({ guestClientId: "guest-1" });
      expect(result).toBe(true);

      expect(prisma.bannedClient.findFirst).toHaveBeenCalledWith({
        where: { guestClientId: "guest-1" },
        select: { id: true },
      });
    });

    it("returns false when client is not banned", async () => {
      asMock(prisma.bannedClient.findFirst).mockResolvedValue(null);

      const result = await isClientBanned({ profileId: "profile-1" });
      expect(result).toBe(false);
    });

    it("throws when neither profileId nor guestClientId is provided", async () => {
      await expect(isClientBanned({})).rejects.toThrow("INVALID_BAN_CHECK");
    });
  });

  describe("getBannedClients", () => {
    it("returns paginated list of banned clients", async () => {
      const bannedList = [
        {
          id: "ban-1",
          profileId: "profile-1",
          guestClientId: null,
          reason: "Comportamento inadequado",
          bannedBy: "barber-1",
          createdAt: new Date("2025-06-15"),
          profile: {
            id: "profile-1",
            fullName: "Carlos",
            phone: "11999999999",
          },
          guestClient: null,
          barber: { id: "barber-1", name: "João" },
        },
      ];

      asMock(prisma.bannedClient.findMany).mockResolvedValue(bannedList);
      asMock(prisma.bannedClient.count).mockResolvedValue(1);

      const result = await getBannedClients({ page: 1, limit: 20 });

      expect(result.data).toEqual(bannedList);
      expect(result.total).toBe(1);
      expect(prisma.bannedClient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe("migrateGuestBanToProfile", () => {
    it("creates a profile ban from an existing guest ban", async () => {
      const tx = {
        bannedClient: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              id: "guest-ban-1",
              reason: "Bloqueado",
              bannedBy: "barber-1",
            })
            .mockResolvedValueOnce(null),
          create: vi.fn().mockResolvedValue({ id: "profile-ban-1" }),
        },
      };

      const result = await migrateGuestBanToProfile(tx as never, {
        guestClientId: "guest-1",
        profileId: "profile-1",
      });

      expect(result).toBe(true);
      expect(tx.bannedClient.create).toHaveBeenCalledWith({
        data: {
          profileId: "profile-1",
          reason: "Bloqueado",
          bannedBy: "barber-1",
        },
      });
    });

    it("returns false when no guest ban exists", async () => {
      const tx = {
        bannedClient: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
        },
      };

      const result = await migrateGuestBanToProfile(tx as never, {
        guestClientId: "guest-1",
        profileId: "profile-1",
      });

      expect(result).toBe(false);
      expect(tx.bannedClient.create).not.toHaveBeenCalled();
    });

    it("returns false when the profile is already banned", async () => {
      const tx = {
        bannedClient: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              id: "guest-ban-1",
              reason: "Bloqueado",
              bannedBy: "barber-1",
            })
            .mockResolvedValueOnce({ id: "profile-ban-1" }),
          create: vi.fn(),
        },
      };

      const result = await migrateGuestBanToProfile(tx as never, {
        guestClientId: "guest-1",
        profileId: "profile-1",
      });

      expect(result).toBe(false);
      expect(tx.bannedClient.create).not.toHaveBeenCalled();
    });
  });
});
