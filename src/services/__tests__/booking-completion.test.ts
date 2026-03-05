import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { AppointmentStatus } from "@prisma/client";

// Mock do prisma
vi.mock("@/lib/prisma", () => {
  const prisma = {
    appointment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return { prisma };
});

import { prisma } from "@/lib/prisma";
import { markAppointmentAsCompleted } from "../booking";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

// Mock da engine de Loyalty service dinamicamente exportada
vi.mock("../loyalty/loyalty.service", () => {
  return {
    LoyaltyService: {
      getOrCreateAccount: vi.fn(),
      creditPoints: vi.fn(),
    },
  };
});

// Mock da engine de cálculo de pontos
vi.mock("../loyalty/points.calculator", () => {
  return {
    calculateAppointmentPoints: vi.fn(),
  };
});

vi.mock("../loyalty/referral.service", () => {
  return {
    ReferralService: {
      creditReferralBonus: vi.fn(),
    },
  };
});

vi.mock("../loyalty/notification.service", () => ({
  LoyaltyNotificationService: {
    notifyPointsEarned: vi.fn(),
  },
}));

describe("services/booking/completion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("markAppointmentAsCompleted throws when appointment is not found", async () => {
    asMock(prisma.appointment.findFirst).mockResolvedValue(null);

    await expect(
      markAppointmentAsCompleted("apt-missing", "barber-1"),
    ).rejects.toThrow("APPOINTMENT_NOT_FOUND");
  });

  it("markAppointmentAsCompleted throws when status is not CONFIRMED", async () => {
    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-1",
      barberId: "barber-1",
      status: AppointmentStatus.NO_SHOW, // Not confirmed
      startTime: "09:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    await expect(
      markAppointmentAsCompleted("apt-1", "barber-1"),
    ).rejects.toThrow("APPOINTMENT_NOT_MARKABLE");
  });

  it("markAppointmentAsCompleted throws when appointment hasn't started yet", async () => {
    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-1",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00", // Start time
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    // Time freeze at 2025-01-01 10:00 (way before 18:00)
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 10, 0, 0, 0)));

    await expect(
      markAppointmentAsCompleted("apt-1", "barber-1"),
    ).rejects.toThrow("APPOINTMENT_NOT_STARTED");
  });

  it("markAppointmentAsCompleted successfully updates status for valid appt", async () => {
    // freeze time after the appointment start (UTC 23:00 = 20:00 BRT)
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-done",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-done",
      clientId: null, // Test guest without loyalty
      service: { price: 50, name: "Corte" },
      status: AppointmentStatus.COMPLETED,
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      startTime: "18:00",
      endTime: "18:30",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await markAppointmentAsCompleted("apt-done", "barber-1");
    expect(updated.status).toBe(AppointmentStatus.COMPLETED);
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "apt-done" },
      data: { status: AppointmentStatus.COMPLETED },
      include: expect.any(Object),
    });
  });

  it("markAppointmentAsCompleted triggers loyalty service if client has profile", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-done",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-done",
      clientId: "reg-client-1",
      client: { id: "reg-client-1" },
      service: { price: 50, name: "Corte" },
      status: AppointmentStatus.COMPLETED,
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      startTime: "18:00",
      endTime: "18:30",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // To mock dynamic imports we mock them inline or test simply that it executed without throwing.
    const { LoyaltyService } = await import("../loyalty/loyalty.service");
    const { calculateAppointmentPoints } = await import(
      "../loyalty/points.calculator"
    );

    // Let the dynamic import mock handle it
    asMock(LoyaltyService.getOrCreateAccount).mockResolvedValue({
      id: "acc-1",
      tier: "BRONZE",
      referredById: null,
    });
    asMock(calculateAppointmentPoints).mockReturnValue({
      base: 50,
      bonus: 0,
      total: 50,
    });

    const updated = await markAppointmentAsCompleted("apt-done", "barber-1");

    expect(updated.status).toBe(AppointmentStatus.COMPLETED);

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);

    expect(LoyaltyService.getOrCreateAccount).toHaveBeenCalledWith(
      "reg-client-1",
    );
    expect(LoyaltyService.creditPoints).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-1",
        points: 50,
        description: "Agendamento concluído: Corte",
      }),
    );

    const { LoyaltyNotificationService } = await import(
      "../loyalty/notification.service"
    );
    expect(LoyaltyNotificationService.notifyPointsEarned).toHaveBeenCalledWith(
      "reg-client-1",
      50,
      expect.stringContaining("Corte"),
    );
    expect(prisma.appointment.count).not.toHaveBeenCalled();
  });

  it("markAppointmentAsCompleted triggers referral bonus on first appointment with referral", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-first",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-first",
      clientId: "reg-client-referred",
      client: { id: "reg-client-referred" },
      service: { price: 50, name: "Corte" },
      status: AppointmentStatus.COMPLETED,
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      startTime: "18:00",
      endTime: "18:30",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { LoyaltyService } = await import("../loyalty/loyalty.service");
    const { calculateAppointmentPoints } = await import(
      "../loyalty/points.calculator"
    );
    const { ReferralService } = await import("../loyalty/referral.service");

    asMock(LoyaltyService.getOrCreateAccount).mockResolvedValue({
      id: "acc-referred",
      tier: "BRONZE",
      referredById: "acc-referrer",
    });
    asMock(prisma.appointment.count).mockResolvedValue(1);
    asMock(calculateAppointmentPoints).mockReturnValue({
      base: 50,
      bonus: 0,
      total: 50,
    });
    asMock(ReferralService.creditReferralBonus).mockResolvedValue(undefined);

    await markAppointmentAsCompleted("apt-first", "barber-1");

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);

    expect(ReferralService.creditReferralBonus).toHaveBeenCalledWith(
      "acc-referred",
    );
  });
});
