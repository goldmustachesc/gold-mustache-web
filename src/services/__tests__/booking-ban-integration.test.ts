import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
vi.mock("@/lib/prisma", () => {
  const prisma = {
    service: { findUnique: vi.fn() },
    profile: { findMany: vi.fn() },
    shopHours: { findUnique: vi.fn() },
    shopClosure: { findMany: vi.fn() },
    barberAbsence: { findMany: vi.fn() },
    workingHours: { findUnique: vi.fn() },
    appointment: { findMany: vi.fn() },
    guestClient: { findUnique: vi.fn() },
    bannedClient: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

import { prisma } from "@/lib/prisma";
import {
  createAppointment,
  createGuestAppointment,
  createAppointmentByBarber,
} from "../booking";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

describe("booking + ban integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));
    asMock(prisma.profile.findMany).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("createAppointment rejects banned registered client", () => {
    it("throws CLIENT_BANNED when the profile is banned", async () => {
      asMock(prisma.service.findUnique).mockResolvedValue({
        id: "service-1",
        duration: 30,
      });

      asMock(prisma.bannedClient.findFirst).mockResolvedValue({
        id: "ban-1",
        profileId: "profile-1",
      });

      await expect(
        createAppointment(
          {
            serviceId: "service-1",
            barberId: "barber-1",
            date: "2025-01-02",
            startTime: "10:00",
          },
          "profile-1",
        ),
      ).rejects.toThrow("CLIENT_BANNED");
    });
  });

  describe("createGuestAppointment rejects banned guest client", () => {
    it("throws CLIENT_BANNED when the guest is banned", async () => {
      asMock(prisma.service.findUnique).mockResolvedValue({
        id: "service-1",
        duration: 30,
      });

      asMock(prisma.guestClient.findUnique).mockResolvedValue({
        id: "guest-1",
        phone: "11999998888",
      });

      asMock(prisma.bannedClient.findFirst).mockResolvedValue({
        id: "ban-2",
        guestClientId: "guest-1",
      });

      await expect(
        createGuestAppointment({
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2025-01-02",
          startTime: "10:00",
          clientName: "João",
          clientPhone: "11999998888",
        }),
      ).rejects.toThrow("CLIENT_BANNED");
    });

    it("proceeds when guest has no ban record", async () => {
      asMock(prisma.service.findUnique).mockResolvedValue({
        id: "service-1",
        duration: 30,
      });

      asMock(prisma.guestClient.findUnique).mockResolvedValue(null);
      asMock(prisma.bannedClient.findFirst).mockResolvedValue(null);

      asMock(prisma.shopHours.findUnique).mockResolvedValue({
        dayOfWeek: 4,
        isOpen: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: null,
        breakEnd: null,
      });
      asMock(prisma.workingHours.findUnique).mockResolvedValue(null);
      asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
      asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

      const createdAppointment = {
        id: "apt-1",
        guestClientId: "guest-new",
        barberId: "barber-1",
        serviceId: "service-1",
        date: new Date("2025-01-02"),
        startTime: "10:00",
        endTime: "10:30",
        status: "CONFIRMED",
        cancelReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        barber: { id: "barber-1", name: "Carlos", avatarUrl: null },
        service: { id: "service-1", name: "Corte", duration: 30, price: 10 },
      };

      asMock(prisma.$transaction).mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            $executeRaw: vi.fn(),
            appointment: {
              findMany: vi.fn().mockResolvedValue([]),
              create: vi.fn().mockResolvedValue(createdAppointment),
            },
            guestClient: {
              upsert: vi.fn().mockResolvedValue({
                id: "guest-new",
                phone: "11999998888",
                fullName: "João",
                accessToken: "token-123",
              }),
            },
          };
          return callback(tx);
        },
      );

      const result = await createGuestAppointment({
        serviceId: "service-1",
        barberId: "barber-1",
        date: "2025-01-02",
        startTime: "10:00",
        clientName: "João",
        clientPhone: "11999998888",
      });

      expect(result.appointment.id).toBe("apt-1");
    });
  });

  describe("createAppointmentByBarber rejects banned guest client", () => {
    it("throws CLIENT_BANNED when the guest is banned", async () => {
      asMock(prisma.service.findUnique).mockResolvedValue({
        id: "service-1",
        duration: 30,
      });

      asMock(prisma.guestClient.findUnique).mockResolvedValue({
        id: "guest-1",
        phone: "11999998888",
      });

      asMock(prisma.bannedClient.findFirst).mockResolvedValue({
        id: "ban-3",
        guestClientId: "guest-1",
      });

      await expect(
        createAppointmentByBarber(
          {
            serviceId: "service-1",
            date: "2025-01-02",
            startTime: "10:00",
            clientName: "João",
            clientPhone: "11999998888",
          },
          "barber-1",
        ),
      ).rejects.toThrow("CLIENT_BANNED");
    });
  });
});
