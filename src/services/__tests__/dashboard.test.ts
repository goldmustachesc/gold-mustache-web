import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";

// Mock Prisma client
vi.mock("@/lib/prisma", () => {
  const prisma = {
    profile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    barber: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    workingHours: {
      findMany: vi.fn(),
    },
    barberAbsence: {
      findMany: vi.fn(),
    },
  };
  return { prisma };
});

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock working-hours lib
vi.mock("@/lib/working-hours", () => ({
  buildWorkingHoursResponse: vi.fn((wh) => wh),
}));

// Mock booking service
vi.mock("@/services/booking", () => ({
  getBarberAppointments: vi.fn(),
}));

// Mock time-slots utilities
vi.mock("@/utils/time-slots", () => ({
  formatPrismaDateToString: (date: Date) => date.toISOString().split("T")[0],
  getBrazilDateString: vi.fn(),
  getMinutesUntilAppointment: vi.fn(),
  parseDateStringToUTC: vi.fn((str: string) => new Date(`${str}T00:00:00Z`)),
}));

// Mock datetime utility
vi.mock("@/utils/datetime", () => ({
  parseIsoDateYyyyMmDdAsSaoPauloDate: vi.fn((str: string) => {
    const d = new Date(`${str}T03:00:00Z`);
    return d;
  }),
}));

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getBarberAppointments } from "@/services/booking";
import {
  getBrazilDateString,
  getMinutesUntilAppointment,
} from "@/utils/time-slots";
import {
  getDashboardIdentity,
  getDashboardStatsData,
  getBarberDashboardInitialData,
} from "../dashboard";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

const TODAY = "2025-01-20";

const mockProfile = {
  id: "profile-1",
  userId: "user-1",
  fullName: "Carlos Silva",
  avatarUrl: null,
  phone: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
  zipCode: null,
  emailVerified: true,
  role: "CLIENT" as const,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-15T00:00:00Z"),
};

const mockProfileMeData = {
  id: "profile-1",
  userId: "user-1",
  fullName: "Carlos Silva",
  avatarUrl: null,
  phone: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
  zipCode: null,
  emailVerified: true,
  role: "CLIENT" as const,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-15T00:00:00.000Z",
};

const mockAppointment = {
  id: "appt-1",
  clientId: "profile-1",
  guestClientId: null,
  barberId: "barber-1",
  serviceId: "service-1",
  date: new Date("2025-01-20T00:00:00Z"),
  startTime: "14:00",
  endTime: "14:30",
  status: "CONFIRMED" as const,
  cancelReason: null,
  createdAt: new Date("2025-01-10T00:00:00Z"),
  updatedAt: new Date("2025-01-10T00:00:00Z"),
  barber: { id: "barber-1", name: "João", avatarUrl: null },
  service: { id: "service-1", name: "Corte", duration: 30, price: "50.00" },
};

describe("services/dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-20T12:00:00Z"));
    asMock(getBrazilDateString).mockReturnValue(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  // ──────────────────────────────────────────────
  // getDashboardIdentity
  // ──────────────────────────────────────────────
  describe("getDashboardIdentity", () => {
    it("returns null when user is not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };
      asMock(createClient).mockResolvedValue(mockSupabase);

      const result = await getDashboardIdentity();

      expect(result).toBeNull();
    });

    it("returns identity with existing profile for authenticated user", async () => {
      const mockUser = {
        id: "user-1",
        email: "carlos@test.com",
        user_metadata: {},
      };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };
      asMock(createClient).mockResolvedValue(mockSupabase);
      asMock(prisma.profile.findUnique).mockResolvedValue(mockProfile);
      asMock(prisma.barber.findUnique).mockResolvedValue(null);

      const result = await getDashboardIdentity();

      expect(result).not.toBeNull();
      expect(result?.userId).toBe("user-1");
      expect(result?.email).toBe("carlos@test.com");
      expect(result?.profile.id).toBe("profile-1");
      expect(result?.barberProfile).toBeNull();
    });

    it("creates profile when none exists", async () => {
      const mockUser = {
        id: "user-1",
        email: "new@test.com",
        user_metadata: { name: "New User" },
      };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };
      asMock(createClient).mockResolvedValue(mockSupabase);
      asMock(prisma.profile.findUnique).mockResolvedValue(null);
      asMock(prisma.profile.create).mockResolvedValue({
        ...mockProfile,
        fullName: "New User",
      });
      asMock(prisma.barber.findUnique).mockResolvedValue(null);

      const result = await getDashboardIdentity();

      expect(prisma.profile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            fullName: "New User",
          }),
        }),
      );
      expect(result?.profile.fullName).toBe("New User");
    });

    it("includes active barber profile when user is a barber", async () => {
      const mockUser = {
        id: "user-1",
        email: "barber@test.com",
        user_metadata: {},
      };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };
      const mockBarber = {
        id: "barber-1",
        userId: "user-1",
        name: "João",
        avatarUrl: null,
        active: true,
      };
      asMock(createClient).mockResolvedValue(mockSupabase);
      asMock(prisma.profile.findUnique).mockResolvedValue({
        ...mockProfile,
        role: "BARBER" as const,
      });
      asMock(prisma.barber.findUnique).mockResolvedValue(mockBarber);

      const result = await getDashboardIdentity();

      expect(result?.barberProfile).toEqual({
        id: "barber-1",
        name: "João",
        avatarUrl: null,
      });
    });

    it("returns null barberProfile when barber is inactive", async () => {
      const mockUser = {
        id: "user-1",
        email: "barber@test.com",
        user_metadata: {},
      };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };
      asMock(createClient).mockResolvedValue(mockSupabase);
      asMock(prisma.profile.findUnique).mockResolvedValue(mockProfile);
      asMock(prisma.barber.findUnique).mockResolvedValue({
        id: "barber-1",
        userId: "user-1",
        name: "João",
        avatarUrl: null,
        active: false,
      });

      const result = await getDashboardIdentity();

      expect(result?.barberProfile).toBeNull();
    });

    it("uses email prefix as fullName fallback when user_metadata is empty", async () => {
      const mockUser = {
        id: "user-1",
        email: "johndoe@test.com",
        user_metadata: {},
      };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };
      asMock(createClient).mockResolvedValue(mockSupabase);
      asMock(prisma.profile.findUnique).mockResolvedValue(null);
      asMock(prisma.profile.create).mockResolvedValue({
        ...mockProfile,
        fullName: "johndoe",
      });
      asMock(prisma.barber.findUnique).mockResolvedValue(null);

      await getDashboardIdentity();

      expect(prisma.profile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fullName: "johndoe" }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // getDashboardStatsData — client stats
  // ──────────────────────────────────────────────
  describe("getDashboardStatsData — client stats", () => {
    it("returns empty client stats when no appointments exist", async () => {
      asMock(prisma.appointment.findMany).mockResolvedValue([]);
      asMock(prisma.appointment.count).mockResolvedValue(0);

      const result = await getDashboardStatsData({
        profile: mockProfileMeData,
        barberProfile: null,
      });

      expect(result.client).not.toBeNull();
      expect(result.client?.totalVisits).toBe(0);
      expect(result.client?.totalSpent).toBe(0);
      expect(result.client?.nextAppointment).toBeNull();
      expect(result.client?.favoriteBarber).toBeNull();
      expect(result.client?.favoriteService).toBeNull();
    });

    it("calculates next appointment from future confirmed appointments", async () => {
      asMock(getMinutesUntilAppointment).mockReturnValue(120);
      asMock(prisma.appointment.findMany).mockResolvedValue([mockAppointment]);
      asMock(prisma.appointment.count).mockResolvedValue(1);

      const result = await getDashboardStatsData({
        profile: mockProfileMeData,
        barberProfile: null,
      });

      expect(result.client?.nextAppointment).not.toBeNull();
      expect(result.client?.nextAppointment?.id).toBe("appt-1");
      expect(result.client?.upcomingCount).toBe(1);
      expect(result.client?.totalVisits).toBe(0);
    });

    it("calculates totalVisits and totalSpent from completed appointments", async () => {
      asMock(getMinutesUntilAppointment).mockReturnValue(-60);
      const completedAppointment = {
        ...mockAppointment,
        status: "COMPLETED" as const,
      };
      asMock(prisma.appointment.findMany).mockResolvedValue([
        completedAppointment,
      ]);
      asMock(prisma.appointment.count).mockResolvedValue(1);

      const result = await getDashboardStatsData({
        profile: mockProfileMeData,
        barberProfile: null,
      });

      expect(result.client?.totalVisits).toBe(1);
      expect(result.client?.totalSpent).toBe(50);
    });

    it("calculates favoriteBarber from completed appointments", async () => {
      asMock(getMinutesUntilAppointment).mockReturnValue(-60);
      const completed = [
        { ...mockAppointment, id: "appt-1", status: "COMPLETED" as const },
        { ...mockAppointment, id: "appt-2", status: "COMPLETED" as const },
      ];
      asMock(prisma.appointment.findMany).mockResolvedValue(completed);
      asMock(prisma.appointment.count).mockResolvedValue(2);

      const result = await getDashboardStatsData({
        profile: mockProfileMeData,
        barberProfile: null,
      });

      expect(result.client?.favoriteBarber).not.toBeNull();
      expect(result.client?.favoriteBarber?.id).toBe("barber-1");
      expect(result.client?.favoriteBarber?.visitCount).toBe(2);
    });

    it("skips client stats when includeClientStats is false and role is BARBER", async () => {
      asMock(prisma.appointment.findMany).mockResolvedValue([]);
      asMock(prisma.appointment.count).mockResolvedValue(0);

      const result = await getDashboardStatsData({
        profile: { ...mockProfileMeData, role: "BARBER" as const },
        barberProfile: null,
        includeClientStats: false,
      });

      expect(result.client).toBeNull();
    });

    it("includes pagination meta in result", async () => {
      asMock(prisma.appointment.findMany).mockResolvedValue([]);
      asMock(prisma.appointment.count).mockResolvedValue(25);

      const result = await getDashboardStatsData({
        profile: mockProfileMeData,
        barberProfile: null,
        pagination: { skip: 10, take: 10 },
      });

      expect(result.meta).toBeDefined();
      expect(result.meta?.total).toBe(25);
      expect(result.meta?.page).toBe(2);
      expect(result.meta?.limit).toBe(10);
      expect(result.meta?.totalPages).toBe(3);
    });
  });

  // ──────────────────────────────────────────────
  // getDashboardStatsData — barber stats
  // ──────────────────────────────────────────────
  describe("getDashboardStatsData — barber stats", () => {
    const barberProfile = { id: "barber-1", name: "João", avatarUrl: null };
    const barberProfileMeData = {
      ...mockProfileMeData,
      role: "BARBER" as const,
    };

    it("returns barber stats with today appointments", async () => {
      // When includeClientStats=false and role=BARBER, shouldLoadClientStats=false
      // so prisma.appointment.findMany is called only once (barber appointments)
      asMock(getMinutesUntilAppointment).mockReturnValue(120);
      asMock(prisma.appointment.findMany).mockResolvedValueOnce([
        {
          ...mockAppointment,
          date: new Date(`${TODAY}T00:00:00Z`),
          status: "CONFIRMED" as const,
          client: { fullName: "Carlos" },
          guestClient: null,
        },
      ]);

      const result = await getDashboardStatsData({
        profile: barberProfileMeData,
        barberProfile,
        includeClientStats: false,
      });

      expect(result.barber).not.toBeNull();
      expect(result.barber?.todayAppointments).toBe(1);
      expect(result.barber?.nextClient).not.toBeNull();
      expect(result.barber?.nextClient?.clientName).toBe("Carlos");
    });

    it("uses guestClient name when client is null", async () => {
      asMock(getMinutesUntilAppointment).mockReturnValue(120);
      asMock(prisma.appointment.findMany).mockResolvedValueOnce([
        {
          ...mockAppointment,
          date: new Date(`${TODAY}T00:00:00Z`),
          status: "CONFIRMED" as const,
          client: null,
          guestClient: { fullName: "Guest User" },
        },
      ]);

      const result = await getDashboardStatsData({
        profile: barberProfileMeData,
        barberProfile,
        includeClientStats: false,
      });

      expect(result.barber?.nextClient?.clientName).toBe("Guest User");
    });

    it("returns null nextClient when no future appointments today", async () => {
      asMock(getMinutesUntilAppointment).mockReturnValue(-30);
      asMock(prisma.appointment.findMany).mockResolvedValueOnce([
        {
          ...mockAppointment,
          date: new Date(`${TODAY}T00:00:00Z`),
          status: "CONFIRMED" as const,
          client: { fullName: "Carlos" },
          guestClient: null,
        },
      ]);

      const result = await getDashboardStatsData({
        profile: barberProfileMeData,
        barberProfile,
        includeClientStats: false,
      });

      expect(result.barber?.nextClient).toBeNull();
      expect(result.barber?.completedToday).toBe(1);
      expect(result.barber?.pendingToday).toBe(0);
    });

    it("calculates weekEarnings from confirmed appointments", async () => {
      asMock(getMinutesUntilAppointment).mockReturnValue(-30);
      asMock(prisma.appointment.findMany).mockResolvedValueOnce([
        {
          ...mockAppointment,
          date: new Date(`${TODAY}T00:00:00Z`),
          status: "CONFIRMED" as const,
          client: null,
          guestClient: null,
        },
        {
          ...mockAppointment,
          id: "appt-2",
          date: new Date("2025-01-19T00:00:00Z"),
          status: "CONFIRMED" as const,
          client: null,
          guestClient: null,
        },
      ]);

      const result = await getDashboardStatsData({
        profile: barberProfileMeData,
        barberProfile,
        includeClientStats: false,
      });

      expect(result.barber?.weekEarnings).toBe(100);
      expect(result.barber?.weekAppointments).toBe(2);
    });

    it("returns null barber stats when barberProfile is null", async () => {
      asMock(prisma.appointment.findMany).mockResolvedValue([]);
      asMock(prisma.appointment.count).mockResolvedValue(0);

      const result = await getDashboardStatsData({
        profile: mockProfileMeData,
        barberProfile: null,
      });

      expect(result.barber).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // getDashboardStatsData — admin stats
  // ──────────────────────────────────────────────
  describe("getDashboardStatsData — admin stats", () => {
    const adminProfile = { ...mockProfileMeData, role: "ADMIN" as const };

    it("returns admin stats with today and week data", async () => {
      // Calls: clientAppointments, clientCount, barberAppointments, adminTodayAppts, adminWeekAppts, barberCount, clientCount
      asMock(prisma.appointment.findMany)
        .mockResolvedValueOnce([]) // client appointments
        .mockResolvedValueOnce([
          {
            id: "admin-appt-1",
            status: "CONFIRMED",
            service: { price: "80.00" },
          },
        ]) // today appointments
        .mockResolvedValueOnce([
          { id: "admin-appt-1", service: { price: "80.00" } },
          { id: "admin-appt-2", service: { price: "60.00" } },
        ]); // week appointments
      asMock(prisma.appointment.count).mockResolvedValueOnce(0); // client total
      asMock(prisma.barber.count).mockResolvedValue(3);
      asMock(prisma.profile.count).mockResolvedValue(150);

      const result = await getDashboardStatsData({
        profile: adminProfile,
        barberProfile: null,
      });

      expect(result.admin).not.toBeNull();
      expect(result.admin?.todayAppointments).toBe(1);
      expect(result.admin?.todayRevenue).toBe(80);
      expect(result.admin?.weekAppointments).toBe(2);
      expect(result.admin?.weekRevenue).toBe(140);
      expect(result.admin?.activeBarbers).toBe(3);
      expect(result.admin?.totalClients).toBe(150);
    });

    it("returns null admin stats for non-admin role", async () => {
      asMock(prisma.appointment.findMany).mockResolvedValue([]);
      asMock(prisma.appointment.count).mockResolvedValue(0);

      const result = await getDashboardStatsData({
        profile: mockProfileMeData,
        barberProfile: null,
      });

      expect(result.admin).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // getBarberDashboardInitialData
  // ──────────────────────────────────────────────
  describe("getBarberDashboardInitialData", () => {
    it("returns working hours, appointments, and absences", async () => {
      const mockWorkingHours = [
        {
          id: "wh-1",
          barberId: "barber-1",
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "18:00",
          active: true,
        },
      ];
      const mockAppointments = [
        {
          id: "appt-1",
          date: "2025-01-20",
          startTime: "10:00",
          endTime: "10:30",
          status: "CONFIRMED",
        },
      ];
      const mockAbsences = [
        {
          id: "absence-1",
          barberId: "barber-1",
          date: new Date("2025-01-21T00:00:00Z"),
          startTime: "09:00",
          endTime: "12:00",
          reason: "Médico",
          createdAt: new Date("2025-01-10T00:00:00Z"),
          updatedAt: new Date("2025-01-10T00:00:00Z"),
        },
      ];

      asMock(prisma.workingHours.findMany).mockResolvedValue(mockWorkingHours);
      asMock(getBarberAppointments).mockResolvedValue(mockAppointments);
      asMock(prisma.barberAbsence.findMany).mockResolvedValue(mockAbsences);

      const result = await getBarberDashboardInitialData({
        barberId: "barber-1",
        startDate: "2025-01-20",
        endDate: "2025-01-26",
      });

      expect(result.workingHours).toEqual(mockWorkingHours);
      expect(result.appointments).toEqual(mockAppointments);
      expect(result.absences).toHaveLength(1);
      expect(result.absences[0].id).toBe("absence-1");
      expect(result.absences[0].date).toBe("2025-01-21");
      expect(result.absences[0].reason).toBe("Médico");
    });

    it("returns empty arrays when no data exists", async () => {
      asMock(prisma.workingHours.findMany).mockResolvedValue([]);
      asMock(getBarberAppointments).mockResolvedValue([]);
      asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

      const result = await getBarberDashboardInitialData({
        barberId: "barber-1",
        startDate: "2025-01-20",
        endDate: "2025-01-26",
      });

      expect(result.workingHours).toEqual([]);
      expect(result.appointments).toEqual([]);
      expect(result.absences).toEqual([]);
    });

    it("queries absences with correct date range (endDate inclusive + 1 day)", async () => {
      asMock(prisma.workingHours.findMany).mockResolvedValue([]);
      asMock(getBarberAppointments).mockResolvedValue([]);
      asMock(prisma.barberAbsence.findMany).mockResolvedValue([]);

      await getBarberDashboardInitialData({
        barberId: "barber-1",
        startDate: "2025-01-20",
        endDate: "2025-01-26",
      });

      expect(prisma.barberAbsence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barberId: "barber-1",
          }),
        }),
      );
    });

    it("maps absence ISO date strings correctly", async () => {
      asMock(prisma.workingHours.findMany).mockResolvedValue([]);
      asMock(getBarberAppointments).mockResolvedValue([]);
      asMock(prisma.barberAbsence.findMany).mockResolvedValue([
        {
          id: "abs-1",
          barberId: "barber-1",
          date: new Date("2025-01-22T00:00:00Z"),
          startTime: "08:00",
          endTime: "10:00",
          reason: null,
          createdAt: new Date("2025-01-01T00:00:00Z"),
          updatedAt: new Date("2025-01-01T00:00:00Z"),
        },
      ]);

      const result = await getBarberDashboardInitialData({
        barberId: "barber-1",
        startDate: "2025-01-20",
        endDate: "2025-01-26",
      });

      expect(result.absences[0].createdAt).toBe("2025-01-01T00:00:00.000Z");
      expect(result.absences[0].updatedAt).toBe("2025-01-01T00:00:00.000Z");
      expect(result.absences[0].reason).toBeNull();
    });
  });
});
