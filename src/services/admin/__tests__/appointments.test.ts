import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findMany: vi.fn(), findUnique: vi.fn() },
    barber: { findUnique: vi.fn() },
    guestClient: { findMany: vi.fn() },
    shopHours: { findUnique: vi.fn() },
    shopClosure: { findMany: vi.fn() },
    workingHours: { findUnique: vi.fn() },
    barberAbsence: { findMany: vi.fn() },
    appointment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/utils/time-slots", () => ({
  getBrazilDateString: vi.fn(() => "2026-04-17"),
  formatPrismaDateToString: vi.fn((d: Date) => d.toISOString().slice(0, 10)),
  parseDateString: vi.fn((s: string) => new Date(`${s}T12:00:00Z`)),
  parseDateStringToUTC: vi.fn((s: string) => new Date(`${s}T00:00:00.000Z`)),
  parseTimeToMinutes: vi.fn((time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }),
  minutesToTime: vi.fn((minutes: number) => {
    const hh = Math.floor(minutes / 60)
      .toString()
      .padStart(2, "0");
    const mm = (minutes % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }),
  roundMinutesUpToSlotBoundary: vi.fn((minutes: number) => minutes),
  roundTimeUpToSlotBoundary: vi.fn((time: string) => time),
  addMinutesToTime: vi.fn((time: string, minutes: number) => {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + minutes;
    const hh = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const mm = (total % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }),
  isDateTimeInPast: vi.fn(() => false),
}));

vi.mock("@/utils/datetime", () => ({
  parseIsoDateYyyyMmDdAsSaoPauloDate: vi.fn(
    (s: string) => new Date(`${s}T12:00:00Z`),
  ),
}));

const mockCreateAppointment = vi.fn();
const mockCreateAppointmentByBarber = vi.fn();
const mockCancelAppointmentInternal = vi.fn();
const mockGetActiveBarbers = vi.fn();
const mockGetBookingAvailability = vi.fn();
const mockNotifyAppointmentCancelledByBarber = vi.fn();
const mockNotifyGuestAppointmentCancelledByBarber = vi.fn();
const mockNotifyGuestAppointmentConfirmed = vi.fn();

function createTransactionMock() {
  return {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    barber: {
      findUnique: vi.fn().mockResolvedValue({ active: true }),
    },
    shopHours: {
      findUnique: vi.fn().mockResolvedValue({
        isOpen: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: null,
        breakEnd: null,
      }),
    },
    shopClosure: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    barberAbsence: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    workingHours: {
      findUnique: vi.fn().mockResolvedValue({
        startTime: "09:00",
        endTime: "18:00",
        breakStart: null,
        breakEnd: null,
      }),
    },
    appointment: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({} as never),
      update: vi.fn().mockResolvedValue({} as never),
    },
  };
}

let transaction = createTransactionMock();

vi.mock("@/services/notification", () => ({
  notifyAppointmentCancelledByBarber: (...args: unknown[]) =>
    mockNotifyAppointmentCancelledByBarber(...args),
  notifyGuestAppointmentCancelledByBarber: (...args: unknown[]) =>
    mockNotifyGuestAppointmentCancelledByBarber(...args),
  notifyGuestAppointmentConfirmed: (...args: unknown[]) =>
    mockNotifyGuestAppointmentConfirmed(...args),
}));

vi.mock("@/services/booking", () => ({
  createAppointment: (...args: unknown[]) => mockCreateAppointment(...args),
  createAppointmentByBarber: (...args: unknown[]) =>
    mockCreateAppointmentByBarber(...args),
  cancelAppointmentInternal: (...args: unknown[]) =>
    mockCancelAppointmentInternal(...args),
  getActiveBarbers: () => mockGetActiveBarbers(),
  getBookingAvailability: (...args: unknown[]) =>
    mockGetBookingAvailability(...args),
}));

import { prisma } from "@/lib/prisma";
import {
  listAppointmentsForAdmin,
  createAppointmentAsAdmin,
  cancelAppointmentAsAdmin,
  rescheduleAppointmentAsAdmin,
  getCalendarForAdmin,
} from "../appointments";

const mockAppointment = {
  id: "apt-1",
  barberId: "barber-1",
  date: new Date("2026-04-17T00:00:00Z"),
  startTime: "10:00",
  endTime: "10:30",
  status: "CONFIRMED" as const,
  source: "CLIENT" as const,
  cancelReason: null,
  createdAt: new Date("2026-04-01T10:00:00Z"),
  barber: { id: "barber-1", name: "João" },
  service: { id: "svc-1", name: "Corte", price: 50, duration: 30 },
  client: { id: "profile-1", fullName: "Fulano", phone: "47999999999" },
  guestClient: null,
};

const mockAppointmentWithDetails = {
  id: "apt-1",
  clientId: "profile-1",
  guestClientId: null,
  barberId: "barber-1",
  serviceId: "svc-1",
  date: "2026-04-17",
  startTime: "10:00",
  endTime: "10:30",
  status: "CONFIRMED" as const,
  cancelReason: null,
  createdAt: "2026-04-01T10:00:00.000Z",
  updatedAt: "2026-04-01T10:00:00.000Z",
  barber: { id: "barber-1", name: "João", avatarUrl: null },
  service: { id: "svc-1", name: "Corte", price: 50, duration: 30 },
  client: { id: "profile-1", fullName: "Fulano", phone: "47999999999" },
  guestClient: null,
};

const mockTransactionAppointment = {
  id: "apt-1",
  clientId: "profile-1",
  guestClientId: null,
  barberId: "barber-1",
  serviceId: "svc-1",
  date: new Date("2026-04-17T00:00:00Z"),
  startTime: "10:00",
  endTime: "10:30",
  status: "CONFIRMED" as const,
  cancelReason: null,
  createdAt: new Date("2026-04-01T10:00:00Z"),
  updatedAt: new Date("2026-04-01T10:00:00Z"),
  barber: { id: "barber-1", name: "João" },
  service: { id: "svc-1", name: "Corte", price: 50, duration: 30 },
  client: { id: "profile-1", fullName: "Fulano", phone: "47999999999" },
  guestClient: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction = createTransactionMock();
  vi.mocked(prisma.$transaction).mockImplementation(async (cb) =>
    cb(transaction as never),
  );
  vi.mocked(prisma.appointment.findMany).mockResolvedValue([
    mockAppointment,
  ] as never);
  vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
    ...mockAppointment,
    clientId: "profile-1",
    guestClientId: null,
    serviceId: "svc-1",
    barberId: "barber-1",
  } as never);
  vi.mocked(prisma.appointment.count).mockResolvedValue(1);
  vi.mocked(prisma.appointment.update).mockResolvedValue({} as never);
  vi.mocked(prisma.profile.findMany).mockResolvedValue([]);
  vi.mocked(prisma.profile.findUnique).mockResolvedValue({
    userId: "client-user-1",
    fullName: "Fulano",
  } as never);
  vi.mocked(prisma.barber.findUnique).mockResolvedValue({
    userId: "barber-user-1",
  } as never);
  vi.mocked(prisma.guestClient.findMany).mockResolvedValue([]);
  vi.mocked(prisma.barberAbsence.findMany).mockResolvedValue([]);
  vi.mocked(prisma.shopHours.findUnique).mockResolvedValue({
    isOpen: true,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: null,
    breakEnd: null,
  } as never);
  vi.mocked(prisma.shopClosure.findMany).mockResolvedValue([]);
  vi.mocked(prisma.workingHours.findUnique).mockResolvedValue({
    startTime: "09:00",
    endTime: "18:00",
    breakStart: null,
    breakEnd: null,
  } as never);
  transaction.appointment.findUnique.mockResolvedValue(
    mockTransactionAppointment as never,
  );
  transaction.appointment.update.mockResolvedValue(
    mockTransactionAppointment as never,
  );
  mockGetBookingAvailability.mockResolvedValue({
    windows: [{ startTime: "10:30", endTime: "11:30" }],
  });
  mockGetActiveBarbers.mockResolvedValue([{ id: "barber-1", name: "João" }]);
  mockCreateAppointment.mockResolvedValue(mockAppointmentWithDetails);
  mockCreateAppointmentByBarber.mockResolvedValue({
    ...mockAppointmentWithDetails,
    clientId: null,
    guestClientId: "guest-1",
    client: null,
    guestClient: { id: "guest-1", fullName: "Convidado", phone: "47988888888" },
  });
  mockCancelAppointmentInternal.mockResolvedValue({
    ...mockAppointmentWithDetails,
    status: "CANCELLED_BY_BARBER" as const,
    cancelReason: "[ADMIN] Motivo",
  });
  mockNotifyAppointmentCancelledByBarber.mockResolvedValue({} as never);
  mockNotifyGuestAppointmentCancelledByBarber.mockResolvedValue(undefined);
  mockNotifyGuestAppointmentConfirmed.mockResolvedValue(undefined);
});

describe("listAppointmentsForAdmin", () => {
  it("returns rows with default date range when no dates given", async () => {
    const { rows, total } = await listAppointmentsForAdmin({});
    expect(total).toBe(1);
    expect(rows[0]?.id).toBe("apt-1");

    const countCall = vi.mocked(prisma.appointment.count).mock.calls[0]?.[0];
    expect(countCall?.where?.date).toBeDefined();
  });

  it("applies barberId filter", async () => {
    await listAppointmentsForAdmin({ barberId: "barber-1" });

    const findCall = vi.mocked(prisma.appointment.findMany).mock.calls[0]?.[0];
    expect(findCall?.where?.barberId).toBe("barber-1");
  });

  it("applies status filter", async () => {
    await listAppointmentsForAdmin({ status: "CONFIRMED" });

    const findCall = vi.mocked(prisma.appointment.findMany).mock.calls[0]?.[0];
    expect(findCall?.where?.status).toBe("CONFIRMED");
  });

  it("q search queries Profile and GuestClient first", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      { id: "profile-1" },
    ] as never);
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([]);

    await listAppointmentsForAdmin({ q: "João" });

    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
    expect(prisma.guestClient.findMany).toHaveBeenCalled();

    const findCall = vi.mocked(prisma.appointment.findMany).mock.calls[0]?.[0];
    expect(findCall?.where).toHaveProperty("OR");
  });

  it("returns empty when q matches nothing", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([]);

    const { rows, total } = await listAppointmentsForAdmin({
      q: "inexistente",
    });

    expect(rows).toHaveLength(0);
    expect(total).toBe(0);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("applies pagination skip/take", async () => {
    await listAppointmentsForAdmin({ page: 2, limit: 10 });

    const findCall = vi.mocked(prisma.appointment.findMany).mock.calls[0]?.[0];
    expect(findCall?.skip).toBe(10);
    expect(findCall?.take).toBe(10);
  });

  it("converts service price to number", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        ...mockAppointment,
        service: {
          id: "svc-1",
          name: "Corte",
          price: { toNumber: () => 75 } as never,
          duration: 30,
        },
      },
    ] as never);

    const { rows } = await listAppointmentsForAdmin({});
    expect(typeof rows[0]?.service?.price).toBe("number");
  });

  it("runs findMany and count in parallel", async () => {
    await listAppointmentsForAdmin({});
    expect(prisma.appointment.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.appointment.count).toHaveBeenCalledTimes(1);
  });
});

describe("createAppointmentAsAdmin", () => {
  it("calls createAppointment for registered client path", async () => {
    const result = await createAppointmentAsAdmin(
      {
        barberId: "barber-1",
        serviceId: "svc-1",
        date: "2026-04-17",
        startTime: "10:00",
        clientProfileId: "profile-1",
      },
      "admin-1",
    );

    expect(mockCreateAppointment).toHaveBeenCalledWith(
      {
        serviceId: "svc-1",
        barberId: "barber-1",
        date: "2026-04-17",
        startTime: "10:00",
      },
      "profile-1",
    );
    expect(result.id).toBe("apt-1");
    expect(result.source).toBe("ADMIN");
  });

  it("calls createAppointmentByBarber for guest path", async () => {
    const result = await createAppointmentAsAdmin(
      {
        barberId: "barber-1",
        serviceId: "svc-1",
        date: "2026-04-17",
        startTime: "10:00",
        guest: { name: "Convidado", phone: "47988888888" },
      },
      "admin-1",
    );

    expect(mockCreateAppointmentByBarber).toHaveBeenCalledWith(
      {
        serviceId: "svc-1",
        date: "2026-04-17",
        startTime: "10:00",
        clientName: "Convidado",
        clientPhone: "47988888888",
      },
      "barber-1",
    );
    expect(result.source).toBe("ADMIN");
    expect(result.guestClient?.fullName).toBe("Convidado");
  });

  it("does not fail guest creation if notification dispatch fails", async () => {
    mockNotifyGuestAppointmentConfirmed.mockRejectedValueOnce(
      new Error("network_error"),
    );

    const result = await createAppointmentAsAdmin(
      {
        barberId: "barber-1",
        serviceId: "svc-1",
        date: "2026-04-17",
        startTime: "10:00",
        guest: { name: "Convidado", phone: "47988888888" },
      },
      "admin-1",
    );

    expect(result.guestClient?.fullName).toBe("Convidado");
    expect(mockNotifyGuestAppointmentConfirmed).toHaveBeenCalled();
  });

  it("updates audit fields after creation", async () => {
    await createAppointmentAsAdmin(
      {
        barberId: "b",
        serviceId: "s",
        date: "2026-04-17",
        startTime: "10:00",
        clientProfileId: "p",
      },
      "admin-1",
    );

    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "ADMIN",
          createdBy: "admin-1",
        }),
      }),
    );
  });

  it("throws VALIDATION_ERROR when neither clientProfileId nor guest provided", async () => {
    await expect(
      createAppointmentAsAdmin(
        {
          barberId: "b",
          serviceId: "s",
          date: "2026-04-17",
          startTime: "10:00",
        } as never,
        "admin-1",
      ),
    ).rejects.toThrow("VALIDATION_ERROR");
  });
});

describe("cancelAppointmentAsAdmin", () => {
  it("calls cancelAppointmentInternal with bypass and CANCELLED_BY_BARBER status", async () => {
    await cancelAppointmentAsAdmin(
      "apt-1",
      "Motivo do cancelamento",
      "admin-1",
    );

    expect(mockCancelAppointmentInternal).toHaveBeenCalledWith("apt-1", {
      newStatus: "CANCELLED_BY_BARBER",
      cancelReason: "[ADMIN] Motivo do cancelamento",
      bypassCancelWindow: true,
    });
  });

  it("returns item with source ADMIN", async () => {
    const result = await cancelAppointmentAsAdmin("apt-1", "Motivo", "admin-1");
    expect(result.source).toBe("ADMIN");
    expect(result.status).toBe("CANCELLED_BY_BARBER");
  });

  it("notifies the client with resolved userId and appointment metadata", async () => {
    await cancelAppointmentAsAdmin("apt-1", "Motivo", "admin-1");

    expect(mockNotifyAppointmentCancelledByBarber).toHaveBeenCalledWith(
      "client-user-1",
      expect.objectContaining({
        appointmentId: "apt-1",
        recipientName: "Fulano",
      }),
    );
  });

  it("does not fail guest cancellation if notification dispatch fails", async () => {
    mockCancelAppointmentInternal.mockResolvedValue({
      ...mockAppointmentWithDetails,
      status: "CANCELLED_BY_BARBER" as const,
      cancelReason: "[ADMIN] Motivo",
      clientId: null,
      client: null,
      guestClient: {
        id: "guest-1",
        fullName: "Convidado",
        phone: "47988888888",
      },
    });
    mockNotifyGuestAppointmentCancelledByBarber.mockRejectedValueOnce(
      new Error("network_error"),
    );

    const result = await cancelAppointmentAsAdmin("apt-1", "Motivo", "admin-1");

    expect(result.status).toBe("CANCELLED_BY_BARBER");
    expect(mockNotifyGuestAppointmentCancelledByBarber).toHaveBeenCalled();
  });

  it("updates audit fields after cancellation", async () => {
    await cancelAppointmentAsAdmin("apt-1", "Motivo", "admin-1");

    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cancelledBy: "admin-1",
          source: "ADMIN",
        }),
      }),
    );
  });

  it("propagates error from cancelAppointmentInternal", async () => {
    mockCancelAppointmentInternal.mockRejectedValue(
      new Error("APPOINTMENT_NOT_FOUND"),
    );
    await expect(
      cancelAppointmentAsAdmin("bad-id", "Motivo", "admin-1"),
    ).rejects.toThrow("APPOINTMENT_NOT_FOUND");
  });
});

describe("rescheduleAppointmentAsAdmin", () => {
  it("throws when appointment is not found", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null as never);

    await expect(
      rescheduleAppointmentAsAdmin(
        "missing",
        { date: "2026-04-25", startTime: "10:30" },
        "admin-1",
      ),
    ).rejects.toThrow("APPOINTMENT_NOT_FOUND");
  });

  it("throws when appointment is not CONFIRMED", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      ...mockAppointment,
      status: "CANCELLED_BY_BARBER",
      clientId: "profile-1",
      guestClientId: null,
      serviceId: "svc-1",
      barberId: "barber-1",
    } as never);
    transaction.appointment.findUnique.mockResolvedValue({
      ...mockTransactionAppointment,
      status: "CANCELLED_BY_BARBER",
    } as never);

    await expect(
      rescheduleAppointmentAsAdmin(
        "apt-1",
        { date: "2026-04-25", startTime: "10:30" },
        "admin-1",
      ),
    ).rejects.toThrow("APPOINTMENT_NOT_RESCHEDULABLE");
  });

  it("throws when slot is unavailable", async () => {
    transaction.workingHours.findUnique.mockResolvedValue({
      startTime: "11:00",
      endTime: "11:30",
      breakStart: null,
      breakEnd: null,
    });
    transaction.appointment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      rescheduleAppointmentAsAdmin(
        "apt-1",
        { date: "2026-04-25", startTime: "10:30" },
        "admin-1",
      ),
    ).rejects.toThrow("SLOT_UNAVAILABLE");
  });

  it("throws when rounded slot crosses day boundary", async () => {
    await expect(
      rescheduleAppointmentAsAdmin(
        "apt-1",
        { date: "2026-04-25", startTime: "23:56" },
        "admin-1",
      ),
    ).rejects.toThrow("SLOT_UNAVAILABLE");
  });

  it("throws when client has overlap on target slot", async () => {
    transaction.appointment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { startTime: "10:30", endTime: "11:00" } as never,
      ]);

    await expect(
      rescheduleAppointmentAsAdmin(
        "apt-1",
        { date: "2026-04-25", startTime: "10:30" },
        "admin-1",
      ),
    ).rejects.toThrow("CLIENT_OVERLAPPING_APPOINTMENT");
  });

  it("updates appointment date/time and audit field on success", async () => {
    transaction.appointment.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    transaction.appointment.update.mockResolvedValue({
      ...mockAppointment,
      date: new Date("2026-04-25T00:00:00.000Z"),
      startTime: "10:30",
      endTime: "11:00",
      source: "ADMIN",
    } as never);

    const result = await rescheduleAppointmentAsAdmin(
      "apt-1",
      { date: "2026-04-25", startTime: "10:30" },
      "admin-1",
    );

    expect(result.date).toBe("2026-04-25");
    expect(result.startTime).toBe("10:30");
    expect(result.endTime).toBe("11:00");
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(2);
    expect(transaction.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "apt-1" },
        data: expect.objectContaining({
          source: "ADMIN",
          rescheduledBy: "admin-1",
        }),
      }),
    );
  });
});

describe("getCalendarForAdmin", () => {
  it("returns calendar days for day view", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    const result = await getCalendarForAdmin({
      view: "day",
      date: "2026-04-17",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBe("2026-04-17");
  });

  it("returns 7 days for week view", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    const result = await getCalendarForAdmin({
      view: "week",
      date: "2026-04-17",
    });

    expect(result).toHaveLength(7);
  });

  it("filters barbers by barberIds", async () => {
    mockGetActiveBarbers.mockResolvedValue([
      { id: "barber-1", name: "João" },
      { id: "barber-2", name: "Pedro" },
    ]);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    const result = await getCalendarForAdmin({
      view: "day",
      date: "2026-04-17",
      barberIds: ["barber-1"],
    });

    const barberIds = new Set(result[0]?.slots.map((s) => s.barberId));
    expect(barberIds.has("barber-2")).toBe(false);
    expect(barberIds.has("barber-1")).toBe(true);
  });

  it("marks slot as occupied when appointment exists for that time", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        ...mockAppointment,
        date: new Date("2026-04-17T00:00:00Z"),
        startTime: "08:00",
        source: "CLIENT" as const,
      },
    ] as never);

    const result = await getCalendarForAdmin({
      view: "day",
      date: "2026-04-17",
    });
    const slot = result[0]?.slots.find(
      (s) => s.time === "08:00" && s.barberId === "barber-1",
    );
    expect(slot?.appointment).not.toBeNull();
  });

  it("marks slot as blocked when barberAbsence covers entire day", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.barberAbsence.findMany).mockResolvedValue([
      {
        id: "abs-1",
        barberId: "barber-1",
        date: new Date("2026-04-17T00:00:00Z"),
        startTime: null,
        endTime: null,
        reason: "Folga",
      },
    ] as never);

    const result = await getCalendarForAdmin({
      view: "day",
      date: "2026-04-17",
    });
    const slot = result[0]?.slots.find((s) => s.barberId === "barber-1");
    expect(slot?.blocked).toBe(true);
    expect(slot?.blockedReason).toBe("Folga");
  });
});
