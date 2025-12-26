import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { AppointmentStatus } from "@prisma/client";

// Mock Prisma client used by the service module
vi.mock("@/lib/prisma", () => {
  const prisma = {
    service: { findUnique: vi.fn(), findMany: vi.fn() },
    shopHours: { findUnique: vi.fn() },
    shopClosure: { findMany: vi.fn() },
    barberAbsence: { findMany: vi.fn() },
    workingHours: { findUnique: vi.fn() },
    appointment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    guestClient: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };

  return { prisma };
});

import { prisma } from "@/lib/prisma";
import {
  canClientCancel,
  shouldWarnLateCancellation,
  createAppointment,
  getAvailableSlots,
  getBarberAppointments,
  getClientAppointments,
  getGuestAppointments,
  getServices,
  cancelAppointmentByBarber,
  cancelAppointmentByClient,
  createGuestAppointment,
  cancelAppointmentByGuest,
} from "../booking";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

describe("services/booking (Prisma-mocked unit tests)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("getAvailableSlots returns [] when service is not found", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue(null);

    const slots = await getAvailableSlots(new Date(), "barber-1", "service-1");
    expect(slots).toEqual([]);
  });

  it("getServices maps results and filters by barber when barberId is provided", async () => {
    asMock(prisma.service.findMany).mockResolvedValue([
      {
        id: "s-1",
        slug: "corte",
        name: "Corte",
        description: null,
        duration: 30,
        price: 10,
        active: true,
      },
    ]);

    const all = await getServices();
    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    expect(all[0]?.price).toBe(10);

    asMock(prisma.service.findMany).mockResolvedValue([
      {
        id: "s-2",
        slug: "barba",
        name: "Barba",
        description: "desc",
        duration: 30,
        price: 20,
        active: true,
      },
    ]);

    const filtered = await getServices("barber-1");
    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        barbers: {
          some: {
            barberId: "barber-1",
          },
        },
      },
      orderBy: { name: "asc" },
    });
    expect(filtered[0]?.id).toBe("s-2");
  });

  it("getAvailableSlots returns [] when shop is closed", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: false,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: null,
      breakEnd: null,
    });

    const slots = await getAvailableSlots(
      new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)),
      "barber-1",
      "service-1",
    );
    expect(slots).toEqual([]);
  });

  it("getAvailableSlots returns [] when shop has a full-day closure", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([
      { startTime: null, endTime: null },
    ]);

    const slots = await getAvailableSlots(
      new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)),
      "barber-1",
      "service-1",
    );
    expect(slots).toEqual([]);
  });

  it("getAvailableSlots returns [] when barber is absent all day", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([
      { startTime: null, endTime: null },
    ]);

    const slots = await getAvailableSlots(
      new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)),
      "barber-1",
      "service-1",
    );
    expect(slots).toEqual([]);
  });

  it("getAvailableSlots returns [] when barber has no working hours", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);
    asMock(prisma.workingHours.findUnique).mockResolvedValue(null);

    const slots = await getAvailableSlots(
      new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)),
      "barber-1",
      "service-1",
    );
    expect(slots).toEqual([]);
  });

  it("getAvailableSlots filters slots that overlap confirmed appointments", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.appointment.findMany).mockResolvedValue([
      {
        startTime: "09:30",
        endTime: "10:00",
        status: "CONFIRMED",
      },
    ]);

    // Freeze time so past-slot filtering is stable: 2025-01-02 00:00 BRT => 03:00Z
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 3, 0, 0, 0)));

    const slots = await getAvailableSlots(
      new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)),
      "barber-1",
      "service-1",
    );

    // Expected base slots: 09:00 and 09:30; 09:30 should be marked unavailable (not removed).
    expect(slots.map((s) => s.time)).toEqual(["09:00", "09:30"]);
    expect(slots.find((s) => s.time === "09:00")?.available).toBe(true);
    expect(slots.find((s) => s.time === "09:30")?.available).toBe(false);
  });

  it("getAvailableSlots filters out slots that violate shop closures (time-specific)", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([
      { startTime: "09:00", endTime: "09:30" },
    ]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.appointment.findMany).mockResolvedValue([]);

    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 3, 0, 0, 0)));

    const slots = await getAvailableSlots(
      new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)),
      "barber-1",
      "service-1",
    );

    expect(slots.map((s) => s.time)).toEqual(["09:30"]);
  });

  it("getAvailableSlots filters out slots that violate barber absences (time-specific)", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([
      { startTime: "09:30", endTime: "10:00" },
    ]);
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.appointment.findMany).mockResolvedValue([]);

    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 3, 0, 0, 0)));

    const slots = await getAvailableSlots(
      new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)),
      "barber-1",
      "service-1",
    );

    expect(slots.map((s) => s.time)).toEqual(["09:00"]);
  });

  it("createAppointment creates appointment when no overlap and policies allow", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));

    asMock(prisma.service.findUnique).mockResolvedValue({
      id: "service-1",
      slug: "corte",
      name: "S",
      description: null,
      duration: 30,
      price: 10,
      active: true,
    });
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "18:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

    asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const callback = cb as (tx: unknown) => Promise<unknown>;
      const tx = {
        $executeRaw: vi.fn(),
        appointment: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({
            id: "apt-1",
            clientId: "client-1",
            guestClientId: null,
            barberId: "barber-1",
            serviceId: "service-1",
            date: new Date(Date.UTC(2099, 0, 1, 0, 0, 0, 0)),
            startTime: "09:00",
            endTime: "09:30",
            status: AppointmentStatus.CONFIRMED,
            cancelReason: null,
            createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
            updatedAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
            client: { id: "client-1", fullName: "X", phone: "11999998888" },
            guestClient: null,
            barber: { id: "barber-1", name: "B", avatarUrl: null },
            service: { id: "service-1", name: "S", duration: 30, price: 10 },
            cancelReasonId: null,
          }),
        },
      };
      return await callback(tx);
    });

    const apt = await createAppointment(
      {
        serviceId: "service-1",
        barberId: "barber-1",
        date: "2099-01-01",
        startTime: "09:00",
      },
      "client-1",
    );

    expect(apt.id).toBe("apt-1");
    expect(apt.clientId).toBe("client-1");
    expect(apt.status).toBe(AppointmentStatus.CONFIRMED);
    expect(apt.service.price).toBe(10);
  });

  it("createAppointment rejects when service does not exist", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue(null);

    await expect(
      createAppointment(
        {
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2099-01-01",
          startTime: "09:00",
        },
        "client-1",
      ),
    ).rejects.toThrow("Service not found");
  });

  it("createAppointment rejects when slot is in the past", async () => {
    // Brazil date is 2025-01-02; appointment is previous day
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));

    asMock(prisma.service.findUnique).mockResolvedValue({
      id: "service-1",
      duration: 30,
      price: 10,
    });

    await expect(
      createAppointment(
        {
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2025-01-01",
          startTime: "09:00",
        },
        "client-1",
      ),
    ).rejects.toThrow("SLOT_IN_PAST");
  });

  it("createAppointment rejects when slot range is outside working hours (BARBER_UNAVAILABLE)", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));
    asMock(prisma.service.findUnique).mockResolvedValue({
      id: "service-1",
      duration: 30,
      price: 10,
    });
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });

    await expect(
      createAppointment(
        {
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2099-01-01",
          startTime: "08:00",
        },
        "client-1",
      ),
    ).rejects.toThrow("BARBER_UNAVAILABLE");
  });

  it("createAppointment rejects when startTime is not aligned to slots grid (SLOT_UNAVAILABLE)", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));
    asMock(prisma.service.findUnique).mockResolvedValue({
      id: "service-1",
      duration: 30,
      price: 10,
    });
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });

    await expect(
      createAppointment(
        {
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2099-01-01",
          startTime: "09:15",
        },
        "client-1",
      ),
    ).rejects.toThrow("SLOT_UNAVAILABLE");
  });

  it("createAppointment rejects when shop is closed (policy)", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));
    asMock(prisma.service.findUnique).mockResolvedValue({
      id: "service-1",
      duration: 30,
      price: 10,
    });
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "18:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopHours.findUnique).mockResolvedValue(null);
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

    await expect(
      createAppointment(
        {
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2099-01-01",
          startTime: "09:00",
        },
        "client-1",
      ),
    ).rejects.toThrow("SHOP_CLOSED");
  });

  it("createAppointment rejects when booking policy fails (BARBER_UNAVAILABLE)", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));
    asMock(prisma.service.findUnique).mockResolvedValue({
      id: "service-1",
      duration: 30,
      price: 10,
    });
    asMock(prisma.workingHours.findUnique).mockResolvedValue(null);

    await expect(
      createAppointment(
        {
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2099-01-01",
          startTime: "09:00",
        },
        "client-1",
      ),
    ).rejects.toThrow("BARBER_UNAVAILABLE");
  });

  it("createAppointment rejects when there is an overlap inside the transaction", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));
    asMock(prisma.service.findUnique).mockResolvedValue({
      id: "service-1",
      duration: 30,
      price: 10,
    });
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "18:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

    asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const callback = cb as (tx: unknown) => Promise<unknown>;
      const tx = {
        $executeRaw: vi.fn(),
        appointment: {
          findMany: vi.fn().mockResolvedValue([
            {
              startTime: "09:00",
              endTime: "09:30",
            },
          ]),
          create: vi.fn(),
        },
      };
      return await callback(tx);
    });

    await expect(
      createAppointment(
        {
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2099-01-01",
          startTime: "09:00",
        },
        "client-1",
      ),
    ).rejects.toThrow("SLOT_OCCUPIED");
  });

  it("createGuestAppointment creates appointment when no overlap", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 3, 0, 0, 0)));

    // Simulate prisma.$transaction callback with tx mocks
    asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const callback = cb as (tx: unknown) => Promise<unknown>;
      const tx = {
        $executeRaw: vi.fn(),
        appointment: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({
            id: "apt-1",
            clientId: null,
            guestClientId: "guest-1",
            barberId: "barber-1",
            serviceId: "service-1",
            date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
            startTime: "09:00",
            endTime: "09:30",
            status: "CONFIRMED",
            cancelReason: null,
            createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
            updatedAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
            client: null,
            guestClient: { id: "guest-1", fullName: "X", phone: "11999998888" },
            barber: { id: "barber-1", name: "B", avatarUrl: null },
            service: { id: "service-1", name: "S", duration: 30, price: 10 },
          }),
        },
        guestClient: {
          upsert: vi.fn().mockResolvedValue({
            id: "guest-1",
            fullName: "X",
            phone: "11999998888",
          }),
        },
      };
      return await callback(tx);
    });

    const apt = await createGuestAppointment({
      serviceId: "service-1",
      barberId: "barber-1",
      date: "2025-01-02",
      startTime: "09:00",
      clientName: "X",
      clientPhone: "(11) 99999-8888",
    });

    expect(apt.id).toBe("apt-1");
    expect(apt.startTime).toBe("09:00");
    expect(apt.endTime).toBe("09:30");
    expect(apt.guestClient?.phone).toBe("11999998888");
  });

  it("createGuestAppointment rejects when service does not exist", async () => {
    asMock(prisma.service.findUnique).mockResolvedValue(null);
    await expect(
      createGuestAppointment({
        serviceId: "service-1",
        barberId: "barber-1",
        date: "2099-01-01",
        startTime: "09:00",
        clientName: "X",
        clientPhone: "(11) 99999-8888",
      }),
    ).rejects.toThrow("Service not found");
  });

  it("createGuestAppointment rejects when shop is closed (policy)", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));

    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopHours.findUnique).mockResolvedValue(null);
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

    await expect(
      createGuestAppointment({
        serviceId: "service-1",
        barberId: "barber-1",
        date: "2099-01-01",
        startTime: "09:00",
        clientName: "X",
        clientPhone: "(11) 99999-8888",
      }),
    ).rejects.toThrow("SHOP_CLOSED");
  });

  it("createGuestAppointment rejects when there is an overlap inside the transaction", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 1, 12, 0, 0, 0)));

    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });
    asMock(prisma.workingHours.findUnique).mockResolvedValue({
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopHours.findUnique).mockResolvedValue({
      isOpen: true,
      startTime: "09:00",
      endTime: "10:00",
      breakStart: null,
      breakEnd: null,
    });
    asMock(prisma.shopClosure.findMany).mockResolvedValue([]);
    asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

    asMock(prisma.$transaction).mockImplementation(async (cb: unknown) => {
      const callback = cb as (tx: unknown) => Promise<unknown>;
      const tx = {
        $executeRaw: vi.fn(),
        appointment: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ startTime: "09:00", endTime: "09:30" }]),
          create: vi.fn(),
        },
        guestClient: { upsert: vi.fn() },
      };
      return await callback(tx);
    });

    await expect(
      createGuestAppointment({
        serviceId: "service-1",
        barberId: "barber-1",
        date: "2099-01-01",
        startTime: "09:00",
        clientName: "X",
        clientPhone: "(11) 99999-8888",
      }),
    ).rejects.toThrow("SLOT_OCCUPIED");
  });

  it("createGuestAppointment rejects when slot is in the past", async () => {
    // Brazil date is 2025-01-02; appointment is previous day
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));

    asMock(prisma.service.findUnique).mockResolvedValue({ duration: 30 });

    await expect(
      createGuestAppointment({
        serviceId: "service-1",
        barberId: "barber-1",
        date: "2025-01-01",
        startTime: "09:00",
        clientName: "X",
        clientPhone: "(11) 99999-8888",
      }),
    ).rejects.toThrow("SLOT_IN_PAST");
  });

  it("getClientAppointments maps prisma results", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));

    asMock(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt-1",
        clientId: "client-1",
        guestClientId: null,
        barberId: "barber-1",
        serviceId: "service-1",
        date: new Date(Date.UTC(2025, 0, 3, 0, 0, 0, 0)),
        startTime: "09:00",
        endTime: "09:30",
        status: AppointmentStatus.CONFIRMED,
        cancelReason: null,
        createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
        updatedAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
        client: { id: "client-1", fullName: "X", phone: "11999998888" },
        guestClient: null,
        barber: { id: "barber-1", name: "B", avatarUrl: null },
        service: { id: "service-1", name: "S", duration: 30, price: 10 },
      },
    ]);

    const result = await getClientAppointments("client-1");
    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBe("2025-01-03");
    expect(result[0]?.service.price).toBe(10);
  });

  it("getBarberAppointments uses lt endDate+1 day to include end date", async () => {
    asMock(prisma.appointment.findMany).mockResolvedValue([]);

    const start = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0));
    await getBarberAppointments("barber-1", { start, end });

    const args = asMock(prisma.appointment.findMany).mock.calls[0]?.[0];
    expect(args.where.date.gte).toEqual(start);
    expect(args.where.date.lt).toEqual(
      new Date(Date.UTC(2025, 0, 3, 0, 0, 0, 0)),
    );
  });

  it("getGuestAppointments returns [] when guest client not found", async () => {
    asMock(prisma.guestClient.findUnique).mockResolvedValue(null);
    await expect(getGuestAppointments("(11) 99999-8888")).resolves.toEqual([]);
  });

  it("getGuestAppointments maps results for guest client", async () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));
    asMock(prisma.guestClient.findUnique).mockResolvedValue({
      id: "guest-1",
      phone: "11999998888",
      fullName: "X",
    });
    asMock(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt-1",
        clientId: null,
        guestClientId: "guest-1",
        barberId: "barber-1",
        serviceId: "service-1",
        date: new Date(Date.UTC(2025, 0, 3, 0, 0, 0, 0)),
        startTime: "09:00",
        endTime: "09:30",
        status: AppointmentStatus.CONFIRMED,
        cancelReason: null,
        createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
        updatedAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
        client: null,
        guestClient: { id: "guest-1", fullName: "X", phone: "11999998888" },
        barber: { id: "barber-1", name: "B", avatarUrl: null },
        service: { id: "service-1", name: "S", duration: 30, price: 10 },
      },
    ]);

    const result = await getGuestAppointments("(11) 99999-8888");
    expect(result).toHaveLength(1);
    expect(result[0]?.guestClient?.id).toBe("guest-1");
  });

  it("canClientCancel returns false when appointment date is before current Brazil date", () => {
    // Brazil date is 2025-01-02
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));
    const appointmentDate = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));
    expect(canClientCancel(appointmentDate, "10:00")).toBe(false);
  });

  it("shouldWarnLateCancellation returns true when appointment is within warning window", () => {
    // Now: 2025-01-02 09:00 BRT => 12:00Z
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));
    const appointmentDate = new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0));
    expect(shouldWarnLateCancellation(appointmentDate, "10:00")).toBe(true);
  });

  it("cancelAppointmentByClient updates status when allowed", async () => {
    // Now: 2025-01-02 09:00 BRT => 12:00Z (appointment at 11:00)
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      clientId: "client-1",
      guestClientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CONFIRMED,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-1",
      clientId: "client-1",
      guestClientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CANCELLED_BY_CLIENT,
      cancelReason: null,
      createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      updatedAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      client: { id: "client-1", fullName: "X", phone: "1" },
      guestClient: null,
      barber: { id: "barber-1", name: "B", avatarUrl: null },
      service: { id: "service-1", name: "S", duration: 30, price: 10 },
    });

    const updated = await cancelAppointmentByClient("apt-1", "client-1");
    expect(updated.status).toBe(AppointmentStatus.CANCELLED_BY_CLIENT);
  });

  it("cancelAppointmentByClient rejects when appointment is not found / unauthorized / not cancellable / in past", async () => {
    asMock(prisma.appointment.findUnique).mockResolvedValue(null);
    await expect(
      cancelAppointmentByClient("apt-404", "client-1"),
    ).rejects.toThrow("APPOINTMENT_NOT_FOUND");

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      clientId: "client-2",
      guestClientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CONFIRMED,
    });
    await expect(
      cancelAppointmentByClient("apt-1", "client-1"),
    ).rejects.toThrow("UNAUTHORIZED");

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      clientId: "client-1",
      guestClientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CANCELLED_BY_CLIENT,
    });
    await expect(
      cancelAppointmentByClient("apt-1", "client-1"),
    ).rejects.toThrow("APPOINTMENT_NOT_CANCELLABLE");

    // In the past: Brazil date is 2025-01-02, appointment is 2025-01-01
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));
    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      clientId: "client-1",
      guestClientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CONFIRMED,
    });
    await expect(
      cancelAppointmentByClient("apt-1", "client-1"),
    ).rejects.toThrow("APPOINTMENT_IN_PAST");
  });

  it("cancelAppointmentByBarber requires reason and updates appointment status", async () => {
    await expect(
      cancelAppointmentByBarber("apt-1", "barber-1", ""),
    ).rejects.toThrow("CANCELLATION_REASON_REQUIRED");

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      clientId: "client-1",
      guestClientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CONFIRMED,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-1",
      clientId: "client-1",
      guestClientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CANCELLED_BY_BARBER,
      cancelReason: "Imprevisto",
      createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      updatedAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      client: { id: "client-1", fullName: "X", phone: "1" },
      guestClient: null,
      barber: { id: "barber-1", name: "B", avatarUrl: null },
      service: { id: "service-1", name: "S", duration: 30, price: 10 },
    });

    const updated = await cancelAppointmentByBarber(
      "apt-1",
      "barber-1",
      " Imprevisto ",
    );
    expect(updated.status).toBe(AppointmentStatus.CANCELLED_BY_BARBER);
    expect(updated.cancelReason).toBe("Imprevisto");
  });

  it("cancelAppointmentByBarber rejects when appointment is not found / unauthorized / not cancellable", async () => {
    asMock(prisma.appointment.findUnique).mockResolvedValue(null);
    await expect(
      cancelAppointmentByBarber("apt-404", "barber-1", "x"),
    ).rejects.toThrow("APPOINTMENT_NOT_FOUND");

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      clientId: "client-1",
      guestClientId: null,
      barberId: "barber-2",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CONFIRMED,
    });
    await expect(
      cancelAppointmentByBarber("apt-1", "barber-1", "x"),
    ).rejects.toThrow("UNAUTHORIZED");

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      clientId: "client-1",
      guestClientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CANCELLED_BY_CLIENT,
    });
    await expect(
      cancelAppointmentByBarber("apt-1", "barber-1", "x"),
    ).rejects.toThrow("APPOINTMENT_NOT_CANCELLABLE");
  });

  it("cancelAppointmentByGuest rejects cancellation after start time", async () => {
    // Now is 2025-01-02 09:05 BRT => 12:05Z
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 5, 0, 0)));

    asMock(prisma.guestClient.findUnique).mockResolvedValue({
      id: "guest-1",
      phone: "11999998888",
      fullName: "X",
    });

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      guestClientId: "guest-1",
      clientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
    });

    await expect(
      cancelAppointmentByGuest("apt-1", "(11) 99999-8888"),
    ).rejects.toThrow("APPOINTMENT_IN_PAST");
  });

  it("cancelAppointmentByGuest updates status when allowed", async () => {
    // Now: 2025-01-02 09:00 BRT => 12:00Z (appointment at 11:00)
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0)));

    asMock(prisma.guestClient.findUnique).mockResolvedValue({
      id: "guest-1",
      phone: "11999998888",
      fullName: "X",
    });
    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      guestClientId: "guest-1",
      clientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CONFIRMED,
    });
    asMock(prisma.appointment.update).mockResolvedValue({
      id: "apt-1",
      clientId: null,
      guestClientId: "guest-1",
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CANCELLED_BY_CLIENT,
      cancelReason: null,
      createdAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      updatedAt: new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0)),
      client: null,
      guestClient: { id: "guest-1", fullName: "X", phone: "11999998888" },
      barber: { id: "barber-1", name: "B", avatarUrl: null },
      service: { id: "service-1", name: "S", duration: 30, price: 10 },
    });

    const updated = await cancelAppointmentByGuest("apt-1", "(11) 99999-8888");
    expect(updated.status).toBe(AppointmentStatus.CANCELLED_BY_CLIENT);
  });

  it("cancelAppointmentByGuest rejects when guest not found / appointment not found / unauthorized / not cancellable", async () => {
    asMock(prisma.guestClient.findUnique).mockResolvedValue(null);
    await expect(
      cancelAppointmentByGuest("apt-1", "(11) 99999-8888"),
    ).rejects.toThrow("GUEST_NOT_FOUND");

    asMock(prisma.guestClient.findUnique).mockResolvedValue({
      id: "guest-1",
      phone: "11999998888",
      fullName: "X",
    });
    asMock(prisma.appointment.findUnique).mockResolvedValue(null);
    await expect(
      cancelAppointmentByGuest("apt-404", "(11) 99999-8888"),
    ).rejects.toThrow("APPOINTMENT_NOT_FOUND");

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      guestClientId: "guest-2",
      clientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CONFIRMED,
    });
    await expect(
      cancelAppointmentByGuest("apt-1", "(11) 99999-8888"),
    ).rejects.toThrow("UNAUTHORIZED");

    asMock(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt-1",
      guestClientId: "guest-1",
      clientId: null,
      barberId: "barber-1",
      serviceId: "service-1",
      date: new Date(Date.UTC(2025, 0, 2, 0, 0, 0, 0)),
      startTime: "11:00",
      endTime: "11:30",
      status: AppointmentStatus.CANCELLED_BY_CLIENT,
    });
    await expect(
      cancelAppointmentByGuest("apt-1", "(11) 99999-8888"),
    ).rejects.toThrow("APPOINTMENT_NOT_CANCELLABLE");
  });
});
