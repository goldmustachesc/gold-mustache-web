import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { AppointmentStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    appointment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  return { prisma };
});

import { prisma } from "@/lib/prisma";
import { markAppointmentAsNoShow } from "../booking";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

vi.mock("../loyalty/loyalty.service", () => {
  return {
    LoyaltyService: {
      getOrCreateAccount: vi.fn(),
      penalizePoints: vi.fn(),
    },
  };
});

vi.mock("../loyalty/points.calculator", () => {
  return {
    calculateAppointmentPoints: vi.fn(),
  };
});

const mockIsFeatureEnabled = vi.fn();
vi.mock("../feature-flags", () => ({
  isFeatureEnabled: (...args: unknown[]) => mockIsFeatureEnabled(...args),
}));

describe("services/booking/noshow-penalty", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("penalizes registered client points on no-show", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-noshow",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-noshow",
      clientId: "reg-client-1",
      client: { id: "reg-client-1" },
      service: { price: 50, name: "Corte" },
      status: AppointmentStatus.NO_SHOW,
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
    });
    asMock(calculateAppointmentPoints).mockReturnValue({
      base: 50,
      bonus: 0,
      total: 50,
    });
    mockIsFeatureEnabled.mockResolvedValue(true);

    await markAppointmentAsNoShow("apt-noshow", "barber-1");

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);

    expect(LoyaltyService.getOrCreateAccount).toHaveBeenCalledWith(
      "reg-client-1",
    );
    expect(LoyaltyService.penalizePoints).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-1",
        points: 50,
        description: "Não compareceu: Corte",
        referenceId: "apt-noshow",
      }),
    );
  });

  it("does not penalize guest clients", async () => {
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
      guestClientId: "guest-1",
      guestClient: { id: "guest-1", fullName: "Guest" },
      service: { price: 50, name: "Corte" },
      status: AppointmentStatus.NO_SHOW,
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      startTime: "18:00",
      endTime: "18:30",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { LoyaltyService } = await import("../loyalty/loyalty.service");
    mockIsFeatureEnabled.mockResolvedValue(true);

    await markAppointmentAsNoShow("apt-guest", "barber-1");

    expect(LoyaltyService.getOrCreateAccount).not.toHaveBeenCalled();
    expect(LoyaltyService.penalizePoints).not.toHaveBeenCalled();
  });

  it("does not break no-show flow if loyalty service fails", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-err",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-err",
      clientId: "reg-client-1",
      client: { id: "reg-client-1" },
      service: { price: 50, name: "Corte" },
      status: AppointmentStatus.NO_SHOW,
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      startTime: "18:00",
      endTime: "18:30",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { LoyaltyService } = await import("../loyalty/loyalty.service");
    asMock(LoyaltyService.getOrCreateAccount).mockRejectedValue(
      new Error("DB connection error"),
    );
    mockIsFeatureEnabled.mockResolvedValue(true);

    const result = await markAppointmentAsNoShow("apt-err", "barber-1");
    expect(result.status).toBe(AppointmentStatus.NO_SHOW);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Falha ao aplicar penalidade de pontos",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("does not penalize when loyalty feature flag is disabled", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 23, 0, 0, 0)));

    asMock(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-flag-off",
      barberId: "barber-1",
      status: AppointmentStatus.CONFIRMED,
      startTime: "18:00",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-flag-off",
      clientId: "reg-client-1",
      client: { id: "reg-client-1" },
      service: { price: 50, name: "Corte" },
      status: AppointmentStatus.NO_SHOW,
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      startTime: "18:00",
      endTime: "18:30",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { LoyaltyService } = await import("../loyalty/loyalty.service");
    mockIsFeatureEnabled.mockResolvedValue(false);

    await markAppointmentAsNoShow("apt-flag-off", "barber-1");

    expect(LoyaltyService.getOrCreateAccount).not.toHaveBeenCalled();
    expect(LoyaltyService.penalizePoints).not.toHaveBeenCalled();
  });
});
