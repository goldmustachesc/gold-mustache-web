import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";

// Mock Prisma client used by the service module
vi.mock("@/lib/prisma", () => {
  const prisma = {
    guestClient: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    appointment: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return { prisma };
});

import { prisma } from "@/lib/prisma";
import { linkGuestAppointmentsToProfile } from "../guest-linking";

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

  describe("linkGuestAppointmentsToProfile", () => {
    it("should return early when phone is null", async () => {
      const result = await linkGuestAppointmentsToProfile("profile-1", null);

      expect(result).toEqual({
        linked: false,
        appointmentsTransferred: 0,
        guestClientDeleted: false,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should return early when phone is undefined", async () => {
      const result = await linkGuestAppointmentsToProfile(
        "profile-1",
        undefined,
      );

      expect(result).toEqual({
        linked: false,
        appointmentsTransferred: 0,
        guestClientDeleted: false,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should return early when phone normalizes to empty string", async () => {
      const result = await linkGuestAppointmentsToProfile("profile-1", "abc");

      expect(result).toEqual({
        linked: false,
        appointmentsTransferred: 0,
        guestClientDeleted: false,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("should return not linked when no guest client found", async () => {
      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue(null),
            delete: vi.fn(),
          },
          appointment: {
            updateMany: vi.fn(),
          },
        };
        return callback(tx);
      });

      const result = await linkGuestAppointmentsToProfile(
        "profile-1",
        "(11) 99999-8888",
      );

      expect(result).toEqual({
        linked: false,
        appointmentsTransferred: 0,
        guestClientDeleted: false,
      });
    });

    it("should transfer appointments and delete guest when phone matches", async () => {
      const mockGuestClient = {
        id: "guest-1",
        fullName: "João Silva",
        phone: "11999998888",
        accessToken: "token-123",
        createdAt: new Date(),
      };

      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue(mockGuestClient),
            delete: vi.fn().mockResolvedValue(mockGuestClient),
          },
          appointment: {
            updateMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(tx);
      });

      const result = await linkGuestAppointmentsToProfile(
        "profile-1",
        "(11) 99999-8888",
      );

      expect(result).toEqual({
        linked: true,
        appointmentsTransferred: 2,
        guestClientDeleted: true,
      });
    });

    it("should normalize phone before lookup (strips non-digits)", async () => {
      let capturedPhone: string | undefined;

      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockImplementation(({ where }) => {
              capturedPhone = where.phone;
              return null;
            }),
            delete: vi.fn(),
          },
          appointment: {
            updateMany: vi.fn(),
          },
        };
        return callback(tx);
      });

      await linkGuestAppointmentsToProfile("profile-1", "+55 (11) 99999-8888");

      expect(capturedPhone).toBe("5511999998888");
    });

    it("should handle guest with zero appointments", async () => {
      const mockGuestClient = {
        id: "guest-1",
        fullName: "Maria Santos",
        phone: "11988887777",
        accessToken: null,
        createdAt: new Date(),
      };

      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue(mockGuestClient),
            delete: vi.fn().mockResolvedValue(mockGuestClient),
          },
          appointment: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(tx);
      });

      const result = await linkGuestAppointmentsToProfile(
        "profile-1",
        "11988887777",
      );

      expect(result).toEqual({
        linked: true,
        appointmentsTransferred: 0,
        guestClientDeleted: true,
      });
    });

    it("should update appointments with correct data", async () => {
      const mockGuestClient = {
        id: "guest-abc",
        fullName: "Pedro Lima",
        phone: "11977776666",
        accessToken: "token-xyz",
        createdAt: new Date(),
      };

      let updateManyArgs: { where: unknown; data: unknown } | undefined;

      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue(mockGuestClient),
            delete: vi.fn().mockResolvedValue(mockGuestClient),
          },
          appointment: {
            updateMany: vi.fn().mockImplementation((args) => {
              updateManyArgs = args;
              return { count: 3 };
            }),
          },
        };
        return callback(tx);
      });

      await linkGuestAppointmentsToProfile("profile-xyz", "11977776666");

      expect(updateManyArgs).toEqual({
        where: { guestClientId: "guest-abc" },
        data: { clientId: "profile-xyz", guestClientId: null },
      });
    });

    it("should delete guest client after transferring appointments", async () => {
      const mockGuestClient = {
        id: "guest-to-delete",
        fullName: "Ana Costa",
        phone: "11966665555",
        accessToken: null,
        createdAt: new Date(),
      };

      let deleteCalledWith: { where: unknown } | undefined;

      asMock(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          guestClient: {
            findUnique: vi.fn().mockResolvedValue(mockGuestClient),
            delete: vi.fn().mockImplementation((args) => {
              deleteCalledWith = args;
              return mockGuestClient;
            }),
          },
          appointment: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      await linkGuestAppointmentsToProfile("profile-abc", "11966665555");

      expect(deleteCalledWith).toEqual({
        where: { id: "guest-to-delete" },
      });
    });
  });
});
