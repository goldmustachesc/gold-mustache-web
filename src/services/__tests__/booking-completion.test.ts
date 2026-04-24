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
      hasExistingTransaction: vi.fn(),
    },
  };
});

// Mock da engine de cálculo de pontos
vi.mock("../loyalty/points.calculator", () => {
  return {
    calculateAppointmentPoints: vi.fn(),
  };
});

vi.mock("../feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

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
  beforeEach(async () => {
    vi.useFakeTimers();
    const { isFeatureEnabled } = await import("../feature-flags");
    asMock(isFeatureEnabled).mockResolvedValue(true);
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
    asMock(LoyaltyService.hasExistingTransaction).mockResolvedValue(false);
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

  it("should credit CHECKIN_BONUS when completing authenticated client appointment", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-checkin",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-checkin",
      clientId: "client-1",
      client: { id: "client-1" },
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

    asMock(LoyaltyService.getOrCreateAccount).mockResolvedValue({
      id: "acc-1",
      tier: "BRONZE",
      referredById: null,
    });
    asMock(LoyaltyService.hasExistingTransaction).mockResolvedValue(false);
    asMock(calculateAppointmentPoints).mockReturnValue({
      base: 50,
      bonus: 0,
      total: 50,
    });

    await markAppointmentAsCompleted("apt-checkin", "barber-1");

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);

    expect(LoyaltyService.creditPoints).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-1",
        type: "EARNED_CHECKIN",
        points: 20,
        description: "Check-in: Corte",
        referenceId: "apt-checkin",
      }),
    );
  });

  it("should NOT credit CHECKIN_BONUS for guest appointments", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-guest",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-guest",
      clientId: null,
      client: null,
      service: { price: 50, name: "Corte" },
      status: AppointmentStatus.COMPLETED,
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      startTime: "18:00",
      endTime: "18:30",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { LoyaltyService } = await import("../loyalty/loyalty.service");

    await markAppointmentAsCompleted("apt-guest", "barber-1");

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);

    const checkinCalls = asMock(LoyaltyService.creditPoints).mock.calls.filter(
      (call) => call[0]?.type === "EARNED_CHECKIN",
    );
    expect(checkinCalls).toHaveLength(0);
    expect(LoyaltyService.hasExistingTransaction).not.toHaveBeenCalled();
  });

  it("should NOT credit duplicate CHECKIN_BONUS when already checked in (idempotency)", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-dup",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-dup",
      clientId: "client-1",
      client: { id: "client-1" },
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

    asMock(LoyaltyService.getOrCreateAccount).mockResolvedValue({
      id: "acc-1",
      tier: "BRONZE",
      referredById: null,
    });
    // Simulate already checked in
    asMock(LoyaltyService.hasExistingTransaction).mockResolvedValue(true);
    asMock(calculateAppointmentPoints).mockReturnValue({
      base: 50,
      bonus: 0,
      total: 50,
    });

    await markAppointmentAsCompleted("apt-dup", "barber-1");

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);

    const checkinCalls = asMock(LoyaltyService.creditPoints).mock.calls.filter(
      (call) => call[0]?.type === "EARNED_CHECKIN",
    );
    expect(checkinCalls).toHaveLength(0);
  });

  it("should credit both EARNED_APPOINTMENT and EARNED_CHECKIN on completion", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-both",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-both",
      clientId: "client-1",
      client: { id: "client-1" },
      service: { price: 50, name: "Barba" },
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

    asMock(LoyaltyService.getOrCreateAccount).mockResolvedValue({
      id: "acc-1",
      tier: "BRONZE",
      referredById: null,
    });
    asMock(LoyaltyService.hasExistingTransaction).mockResolvedValue(false);
    asMock(calculateAppointmentPoints).mockReturnValue({
      base: 50,
      bonus: 0,
      total: 50,
    });

    await markAppointmentAsCompleted("apt-both", "barber-1");

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);

    expect(LoyaltyService.creditPoints).toHaveBeenCalledTimes(2);
    expect(LoyaltyService.creditPoints).toHaveBeenCalledWith(
      expect.objectContaining({ type: "EARNED_APPOINTMENT" }),
    );
    expect(LoyaltyService.creditPoints).toHaveBeenCalledWith(
      expect.objectContaining({ type: "EARNED_CHECKIN", points: 20 }),
    );
  });
});
