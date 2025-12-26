import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { NotificationType } from "@prisma/client";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    barber: {
      findUnique: vi.fn(),
    },
  };

  return { prisma };
});

import { prisma } from "@/lib/prisma";
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  notifyAppointmentConfirmed,
  notifyAppointmentCancelledByBarber,
  notifyAppointmentCancelledByClient,
  notifyAppointmentReminder,
  notifyBarberOfAppointmentCancelledByClient,
} from "../notification";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

describe("services/notification (Prisma-mocked unit tests)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("createNotification persists and maps DB model to NotificationData", async () => {
    const createdAt = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));
    asMock(prisma.notification.create).mockResolvedValue({
      id: "n-1",
      userId: "u-1",
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: "T",
      message: "M",
      data: { a: 1 },
      read: false,
      createdAt,
    });

    const result = await createNotification({
      userId: "u-1",
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: "T",
      message: "M",
      data: { a: 1 },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u-1",
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: "T",
        message: "M",
        data: { a: 1 },
        read: false,
      },
    });

    expect(result).toEqual({
      id: "n-1",
      userId: "u-1",
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: "T",
      message: "M",
      data: { a: 1 },
      read: false,
      createdAt: createdAt.toISOString(),
    });
  });

  it("getNotifications maps rows and returns newest first (DB ordering)", async () => {
    asMock(prisma.notification.findMany).mockResolvedValue([
      {
        id: "n-2",
        userId: "u-1",
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: "B",
        message: "MB",
        data: null,
        read: true,
        createdAt: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      },
      {
        id: "n-1",
        userId: "u-1",
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: "A",
        message: "MA",
        data: { x: "y" },
        read: false,
        createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      },
    ]);

    const result = await getNotifications("u-1");

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "u-1" },
      orderBy: { createdAt: "desc" },
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("n-2");
    expect(result[1]?.id).toBe("n-1");
    expect(result[0]?.createdAt).toBe("2025-01-02T00:00:00.000Z");
  });

  it("getUnreadCount delegates to prisma.notification.count", async () => {
    asMock(prisma.notification.count).mockResolvedValue(3);
    await expect(getUnreadCount("u-1")).resolves.toBe(3);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "u-1", read: false },
    });
  });

  it("markAsRead uses updateMany with userId guard (prevents IDOR)", async () => {
    asMock(prisma.notification.updateMany).mockResolvedValue({ count: 1 });
    await expect(markAsRead("n-1", "u-1")).resolves.toBeUndefined();
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n-1", userId: "u-1" },
      data: { read: true },
    });
  });

  it("markAllAsRead marks all unread notifications for user", async () => {
    asMock(prisma.notification.updateMany).mockResolvedValue({ count: 2 });
    await expect(markAllAsRead("u-1")).resolves.toBeUndefined();
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u-1", read: false },
      data: { read: true },
    });
  });

  it("notification triggers create notifications with correct type/title and message format", async () => {
    asMock(prisma.notification.create).mockResolvedValue({
      id: "n-1",
      userId: "u-1",
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: "Agendamento Confirmado",
      message: "x",
      data: null,
      read: false,
      createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    await notifyAppointmentConfirmed("u-1", {
      serviceName: "Corte",
      barberName: "João",
      date: "02-01-2025",
      time: "10:00",
    });

    await notifyAppointmentCancelledByBarber("u-1", {
      serviceName: "Corte",
      barberName: "João",
      date: "02-01-2025",
      time: "10:00",
      reason: "Imprevisto",
    });

    await notifyAppointmentCancelledByClient("u-2", {
      clientName: "Maria",
      serviceName: "Corte",
      date: "02-01-2025",
      time: "10:00",
    });

    await notifyAppointmentReminder("u-1", {
      serviceName: "Corte",
      barberName: "João",
      date: "02-01-2025",
      time: "10:00",
    });

    expect(prisma.notification.create).toHaveBeenCalled();
    const calls = asMock(prisma.notification.create).mock.calls;

    expect(
      calls.some(
        (c) => c[0].data.type === NotificationType.APPOINTMENT_CONFIRMED,
      ),
    ).toBe(true);
    expect(
      calls.some(
        (c) => c[0].data.type === NotificationType.APPOINTMENT_CANCELLED,
      ),
    ).toBe(true);
    expect(
      calls.some(
        (c) => c[0].data.type === NotificationType.APPOINTMENT_REMINDER,
      ),
    ).toBe(true);
  });

  it("notifyBarberOfAppointmentCancelledByClient no-ops if barber userId cannot be resolved", async () => {
    asMock(prisma.barber.findUnique).mockResolvedValue(null);

    await expect(
      notifyBarberOfAppointmentCancelledByClient({
        barberId: "b-1",
        startTime: "10:00",
        date: "2025-12-15",
        service: { id: "s-1", name: "Corte", duration: 30, price: 10 },
        client: { id: "c-1", fullName: "Maria", phone: "11999998888" },
        guestClient: null,
      }),
    ).resolves.toBeUndefined();

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("notifyBarberOfAppointmentCancelledByClient resolves barber userId and formats date dd-MM-yyyy", async () => {
    asMock(prisma.barber.findUnique).mockResolvedValue({
      userId: "u-barber-1",
    });
    asMock(prisma.notification.create).mockResolvedValue({
      id: "n-1",
      userId: "u-barber-1",
      type: NotificationType.APPOINTMENT_CANCELLED,
      title: "Agendamento Cancelado",
      message: "x",
      data: null,
      read: false,
      createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    await expect(
      notifyBarberOfAppointmentCancelledByClient({
        barberId: "b-1",
        startTime: "10:00",
        date: "2025-12-15",
        service: { id: "s-1", name: "Corte", duration: 30, price: 10 },
        client: null,
        guestClient: { id: "g-1", fullName: "Convidado", phone: "11999998888" },
      }),
    ).resolves.toBeUndefined();

    expect(prisma.barber.findUnique).toHaveBeenCalledWith({
      where: { id: "b-1" },
      select: { userId: true },
    });

    const createArgs = asMock(prisma.notification.create).mock.calls[0]?.[0];
    expect(createArgs.data.userId).toBe("u-barber-1");
    expect(createArgs.data.type).toBe(NotificationType.APPOINTMENT_CANCELLED);
    expect(createArgs.data.message).toContain("Convidado");
    expect(createArgs.data.message).toContain("15-12-2025");
    expect(createArgs.data.message).toContain("10:00");
  });

  it('notifyBarberOfAppointmentCancelledByClient falls back to "Cliente" when names are missing', async () => {
    asMock(prisma.barber.findUnique).mockResolvedValue({
      userId: "u-barber-1",
    });
    asMock(prisma.notification.create).mockResolvedValue({
      id: "n-1",
      userId: "u-barber-1",
      type: NotificationType.APPOINTMENT_CANCELLED,
      title: "Agendamento Cancelado",
      message: "x",
      data: null,
      read: false,
      createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
    });

    await notifyBarberOfAppointmentCancelledByClient({
      barberId: "b-1",
      startTime: "10:00",
      date: "2025-12-15",
      service: { id: "s-1", name: "Corte", duration: 30, price: 10 },
      client: null,
      guestClient: null,
    });

    const createArgs = asMock(prisma.notification.create).mock.calls[0]?.[0];
    expect(createArgs.data.message).toContain("Cliente");
  });
});
