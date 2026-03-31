import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";

// Mock Prisma client used by the service module
vi.mock("@/lib/prisma", () => {
  const prisma = {
    guestClient: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      updateMany: vi.fn(),
    },
    bannedClient: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return { prisma };
});

import { prisma } from "@/lib/prisma";
import { claimGuestAppointmentsToProfile } from "../guest-linking";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

describe("services/guest-linking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("claimGuestAppointmentsToProfile", () => {
    it("throws when guest token is blank", async () => {
      await expect(
        claimGuestAppointmentsToProfile({
          profileId: "profile-1",
          guestToken: "   ",
        }),
      ).rejects.toThrow("MISSING_GUEST_TOKEN");

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("throws when no guest client is found for the token", async () => {
      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
          },
          appointment: {
            updateMany: vi.fn(),
          },
          bannedClient: {
            findFirst: vi.fn(),
            create: vi.fn(),
          },
        };
        return callback(tx);
      });

      await expect(
        claimGuestAppointmentsToProfile({
          profileId: "profile-1",
          guestToken: "guest-token-1",
        }),
      ).rejects.toThrow("GUEST_NOT_FOUND");
    });

    it("throws when token already belongs to another claimed profile", async () => {
      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue({
              id: "guest-1",
              claimedAt: new Date("2026-03-30T10:00:00.000Z"),
              claimedByProfileId: "profile-2",
            }),
            update: vi.fn(),
          },
          appointment: {
            updateMany: vi.fn(),
          },
          bannedClient: {
            findFirst: vi.fn(),
            create: vi.fn(),
          },
        };
        return callback(tx);
      });

      await expect(
        claimGuestAppointmentsToProfile({
          profileId: "profile-1",
          guestToken: "guest-token-1",
        }),
      ).rejects.toThrow("GUEST_ALREADY_CLAIMED");
    });

    it("transfers appointments, marks the guest as claimed and migrates the ban", async () => {
      let updateManyArgs: { where: unknown; data: unknown } | undefined;
      let guestUpdateArgs: { where: unknown; data: unknown } | undefined;
      let createdBanArgs: { data: unknown } | undefined;

      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue({
              id: "guest-1",
              claimedAt: null,
              claimedByProfileId: null,
              accessTokenConsumedAt: null,
            }),
            update: vi.fn().mockImplementation((args) => {
              guestUpdateArgs = args;
              return args;
            }),
          },
          appointment: {
            updateMany: vi.fn().mockImplementation((args) => {
              updateManyArgs = args;
              return { count: 2 };
            }),
          },
          bannedClient: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce({
                id: "guest-ban-1",
                reason: "Bloqueado",
                bannedBy: "barber-1",
              })
              .mockResolvedValueOnce(null),
            create: vi.fn().mockImplementation((args) => {
              createdBanArgs = args;
              return { id: "profile-ban-1", ...args.data };
            }),
          },
        };
        return callback(tx);
      });

      const result = await claimGuestAppointmentsToProfile({
        profileId: "profile-1",
        guestToken: "guest-token-1",
      });

      expect(result).toEqual({
        linked: true,
        appointmentsTransferred: 2,
        guestClientClaimed: true,
        banMigrated: true,
        alreadyClaimed: false,
      });
      expect(updateManyArgs).toEqual({
        where: { guestClientId: "guest-1" },
        data: { clientId: "profile-1", guestClientId: null },
      });
      expect(guestUpdateArgs).toEqual({
        where: { id: "guest-1" },
        data: {
          accessTokenConsumedAt: expect.any(Date),
          claimedAt: expect.any(Date),
          claimedByProfileId: "profile-1",
        },
      });
      expect(createdBanArgs).toEqual({
        data: {
          profileId: "profile-1",
          reason: "Bloqueado",
          bannedBy: "barber-1",
        },
      });
    });

    it("is idempotent when the same profile retries an already claimed guest", async () => {
      const guestUpdate = vi.fn();
      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue({
              id: "guest-1",
              claimedAt: new Date("2026-03-30T10:00:00.000Z"),
              claimedByProfileId: "profile-1",
              accessTokenConsumedAt: new Date("2026-03-30T10:00:00.000Z"),
            }),
            update: guestUpdate,
          },
          appointment: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          bannedClient: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
        };
        return callback(tx);
      });

      const result = await claimGuestAppointmentsToProfile({
        profileId: "profile-1",
        guestToken: "guest-token-1",
      });

      expect(result).toEqual({
        linked: false,
        appointmentsTransferred: 0,
        guestClientClaimed: false,
        banMigrated: false,
        alreadyClaimed: true,
      });
      expect(guestUpdate).not.toHaveBeenCalled();
    });

    it("does not duplicate the ban when the profile is already banned", async () => {
      const createBan = vi.fn();
      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue({
              id: "guest-1",
              claimedAt: null,
              claimedByProfileId: null,
              accessTokenConsumedAt: null,
            }),
            update: vi.fn(),
          },
          appointment: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          bannedClient: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce({
                id: "guest-ban-1",
                reason: "Bloqueado",
                bannedBy: "barber-1",
              })
              .mockResolvedValueOnce({ id: "profile-ban-1" }),
            create: createBan,
          },
        };
        return callback(tx);
      });

      const result = await claimGuestAppointmentsToProfile({
        profileId: "profile-1",
        guestToken: "guest-token-1",
      });

      expect(result.banMigrated).toBe(false);
      expect(createBan).not.toHaveBeenCalled();
    });

    it("transfers outstanding guest appointments even when already claimed by the same profile", async () => {
      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue({
              id: "guest-1",
              claimedAt: new Date("2026-03-30T10:00:00.000Z"),
              claimedByProfileId: "profile-1",
              accessTokenConsumedAt: new Date("2026-03-30T10:00:00.000Z"),
            }),
            update: vi.fn(),
          },
          appointment: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          bannedClient: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
        };
        return callback(tx);
      });

      const result = await claimGuestAppointmentsToProfile({
        profileId: "profile-1",
        guestToken: "guest-token-1",
      });

      expect(result).toEqual({
        linked: true,
        appointmentsTransferred: 1,
        guestClientClaimed: false,
        banMigrated: false,
        alreadyClaimed: true,
      });
    });

    it("consumes a previously active token even when claim metadata already existed", async () => {
      let guestUpdateArgs: { where: unknown; data: unknown } | undefined;

      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue({
              id: "guest-1",
              claimedAt: new Date("2026-03-30T10:00:00.000Z"),
              claimedByProfileId: "profile-1",
              accessTokenConsumedAt: null,
            }),
            update: vi.fn().mockImplementation((args) => {
              guestUpdateArgs = args;
              return args;
            }),
          },
          appointment: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          bannedClient: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
          },
        };
        return callback(tx);
      });

      const result = await claimGuestAppointmentsToProfile({
        profileId: "profile-1",
        guestToken: "guest-token-1",
      });

      expect(result).toEqual({
        linked: true,
        appointmentsTransferred: 0,
        guestClientClaimed: false,
        banMigrated: false,
        alreadyClaimed: true,
      });
      expect(guestUpdateArgs).toEqual({
        where: { id: "guest-1" },
        data: {
          accessTokenConsumedAt: expect.any(Date),
        },
      });
    });
  });
});
