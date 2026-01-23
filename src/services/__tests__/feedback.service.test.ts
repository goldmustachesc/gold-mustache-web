import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { AppointmentStatus } from "@prisma/client";

// Mock Prisma client
vi.mock("@/lib/prisma", () => {
  const prisma = {
    appointment: { findUnique: vi.fn() },
    feedback: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    guestClient: { findUnique: vi.fn() },
    barber: { findMany: vi.fn() },
  };
  return { prisma };
});

// Mock time-slots utilities
vi.mock("@/utils/time-slots", () => ({
  formatPrismaDateToString: (date: Date) => date.toISOString().split("T")[0],
  getMinutesUntilAppointment: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getMinutesUntilAppointment } from "@/utils/time-slots";
import {
  createFeedback,
  createGuestFeedback,
  getAppointmentFeedback,
  getBarberFeedbacks,
  getBarberFeedbackStats,
  getAllFeedbacks,
  getOverallFeedbackStats,
  getBarberRanking,
  getBarberFeedbacksAdmin,
} from "../feedback";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

const mockFeedbackData = {
  id: "feedback-1",
  appointmentId: "appt-1",
  barberId: "barber-1",
  clientId: "client-1",
  guestClientId: null,
  rating: 5,
  comment: "Great service!",
  createdAt: new Date("2025-01-20T10:00:00Z"),
  appointment: {
    id: "appt-1",
    date: new Date("2025-01-20"),
    startTime: "10:00",
    service: { id: "service-1", name: "Corte" },
  },
  barber: { id: "barber-1", name: "João", avatarUrl: null },
  client: { id: "client-1", fullName: "Carlos Silva" },
  guestClient: null,
};

describe("services/feedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-20T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("createFeedback", () => {
    it("throws INVALID_RATING for rating < 1", async () => {
      await expect(
        createFeedback({ appointmentId: "appt-1", rating: 0 }, "client-1"),
      ).rejects.toThrow("INVALID_RATING");
    });

    it("throws INVALID_RATING for rating > 5", async () => {
      await expect(
        createFeedback({ appointmentId: "appt-1", rating: 6 }, "client-1"),
      ).rejects.toThrow("INVALID_RATING");
    });

    it("throws INVALID_RATING for non-integer rating", async () => {
      await expect(
        createFeedback({ appointmentId: "appt-1", rating: 3.5 }, "client-1"),
      ).rejects.toThrow("INVALID_RATING");
    });

    it("throws APPOINTMENT_NOT_FOUND when appointment does not exist", async () => {
      asMock(prisma.appointment.findUnique).mockResolvedValue(null);

      await expect(
        createFeedback({ appointmentId: "appt-1", rating: 5 }, "client-1"),
      ).rejects.toThrow("APPOINTMENT_NOT_FOUND");
    });

    it("throws UNAUTHORIZED when client does not own appointment", async () => {
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        clientId: "other-client",
        status: AppointmentStatus.COMPLETED,
        feedback: null,
      });

      await expect(
        createFeedback({ appointmentId: "appt-1", rating: 5 }, "client-1"),
      ).rejects.toThrow("UNAUTHORIZED");
    });

    it("throws APPOINTMENT_NOT_COMPLETED for pending appointment", async () => {
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        clientId: "client-1",
        status: AppointmentStatus.PENDING,
        date: new Date("2025-01-25"),
        startTime: "10:00",
        feedback: null,
      });

      await expect(
        createFeedback({ appointmentId: "appt-1", rating: 5 }, "client-1"),
      ).rejects.toThrow("APPOINTMENT_NOT_COMPLETED");
    });

    it("throws APPOINTMENT_NOT_COMPLETED for future CONFIRMED appointment", async () => {
      asMock(getMinutesUntilAppointment).mockReturnValue(60); // 60 min in future

      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        clientId: "client-1",
        status: AppointmentStatus.CONFIRMED,
        date: new Date("2025-01-20"),
        startTime: "16:00",
        feedback: null,
      });

      await expect(
        createFeedback({ appointmentId: "appt-1", rating: 5 }, "client-1"),
      ).rejects.toThrow("APPOINTMENT_NOT_COMPLETED");
    });

    it("throws FEEDBACK_ALREADY_EXISTS when feedback exists", async () => {
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        clientId: "client-1",
        status: AppointmentStatus.COMPLETED,
        date: new Date("2025-01-20"),
        startTime: "10:00",
        feedback: { id: "existing-feedback" },
      });

      await expect(
        createFeedback({ appointmentId: "appt-1", rating: 5 }, "client-1"),
      ).rejects.toThrow("FEEDBACK_ALREADY_EXISTS");
    });

    it("creates feedback for COMPLETED appointment", async () => {
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        clientId: "client-1",
        barberId: "barber-1",
        status: AppointmentStatus.COMPLETED,
        date: new Date("2025-01-20"),
        startTime: "10:00",
        feedback: null,
      });

      asMock(prisma.feedback.create).mockResolvedValue(mockFeedbackData);

      const result = await createFeedback(
        { appointmentId: "appt-1", rating: 5, comment: "  Great service!  " },
        "client-1",
      );

      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: {
          appointmentId: "appt-1",
          barberId: "barber-1",
          clientId: "client-1",
          rating: 5,
          comment: "Great service!",
        },
        include: expect.any(Object),
      });

      expect(result.id).toBe("feedback-1");
      expect(result.rating).toBe(5);
    });

    it("creates feedback for past CONFIRMED appointment", async () => {
      asMock(getMinutesUntilAppointment).mockReturnValue(-60); // 60 min in past

      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        clientId: "client-1",
        barberId: "barber-1",
        status: AppointmentStatus.CONFIRMED,
        date: new Date("2025-01-20"),
        startTime: "14:00",
        feedback: null,
      });

      asMock(prisma.feedback.create).mockResolvedValue(mockFeedbackData);

      const result = await createFeedback(
        { appointmentId: "appt-1", rating: 4 },
        "client-1",
      );

      expect(result.id).toBe("feedback-1");
    });

    it("handles null comment", async () => {
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        clientId: "client-1",
        barberId: "barber-1",
        status: AppointmentStatus.COMPLETED,
        date: new Date("2025-01-20"),
        startTime: "10:00",
        feedback: null,
      });

      asMock(prisma.feedback.create).mockResolvedValue({
        ...mockFeedbackData,
        comment: null,
      });

      await createFeedback({ appointmentId: "appt-1", rating: 5 }, "client-1");

      expect(prisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ comment: null }),
        }),
      );
    });
  });

  describe("createGuestFeedback", () => {
    it("throws INVALID_RATING for invalid rating", async () => {
      await expect(
        createGuestFeedback({ appointmentId: "appt-1", rating: 0 }, "token-1"),
      ).rejects.toThrow("INVALID_RATING");
    });

    it("throws GUEST_NOT_FOUND when guest does not exist", async () => {
      asMock(prisma.guestClient.findUnique).mockResolvedValue(null);

      await expect(
        createGuestFeedback({ appointmentId: "appt-1", rating: 5 }, "token-1"),
      ).rejects.toThrow("GUEST_NOT_FOUND");
    });

    it("throws APPOINTMENT_NOT_FOUND when appointment does not exist", async () => {
      asMock(prisma.guestClient.findUnique).mockResolvedValue({
        id: "guest-1",
        accessToken: "token-1",
      });
      asMock(prisma.appointment.findUnique).mockResolvedValue(null);

      await expect(
        createGuestFeedback({ appointmentId: "appt-1", rating: 5 }, "token-1"),
      ).rejects.toThrow("APPOINTMENT_NOT_FOUND");
    });

    it("throws UNAUTHORIZED when guest does not own appointment", async () => {
      asMock(prisma.guestClient.findUnique).mockResolvedValue({
        id: "guest-1",
        accessToken: "token-1",
      });
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        guestClientId: "other-guest",
        status: AppointmentStatus.COMPLETED,
        feedback: null,
      });

      await expect(
        createGuestFeedback({ appointmentId: "appt-1", rating: 5 }, "token-1"),
      ).rejects.toThrow("UNAUTHORIZED");
    });

    it("throws APPOINTMENT_NOT_COMPLETED for non-completed appointment", async () => {
      asMock(prisma.guestClient.findUnique).mockResolvedValue({
        id: "guest-1",
        accessToken: "token-1",
      });
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        guestClientId: "guest-1",
        status: AppointmentStatus.PENDING,
        date: new Date("2025-01-25"),
        startTime: "10:00",
        feedback: null,
      });

      await expect(
        createGuestFeedback({ appointmentId: "appt-1", rating: 5 }, "token-1"),
      ).rejects.toThrow("APPOINTMENT_NOT_COMPLETED");
    });

    it("throws FEEDBACK_ALREADY_EXISTS when feedback exists", async () => {
      asMock(prisma.guestClient.findUnique).mockResolvedValue({
        id: "guest-1",
        accessToken: "token-1",
      });
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        guestClientId: "guest-1",
        status: AppointmentStatus.COMPLETED,
        date: new Date("2025-01-20"),
        startTime: "10:00",
        feedback: { id: "existing" },
      });

      await expect(
        createGuestFeedback({ appointmentId: "appt-1", rating: 5 }, "token-1"),
      ).rejects.toThrow("FEEDBACK_ALREADY_EXISTS");
    });

    it("creates feedback for guest", async () => {
      asMock(prisma.guestClient.findUnique).mockResolvedValue({
        id: "guest-1",
        accessToken: "token-1",
      });
      asMock(prisma.appointment.findUnique).mockResolvedValue({
        id: "appt-1",
        guestClientId: "guest-1",
        barberId: "barber-1",
        status: AppointmentStatus.COMPLETED,
        date: new Date("2025-01-20"),
        startTime: "10:00",
        feedback: null,
      });
      asMock(prisma.feedback.create).mockResolvedValue({
        ...mockFeedbackData,
        clientId: null,
        guestClientId: "guest-1",
        guestClient: { id: "guest-1", fullName: "Guest User" },
        client: null,
      });

      const result = await createGuestFeedback(
        { appointmentId: "appt-1", rating: 5 },
        "token-1",
      );

      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: {
          appointmentId: "appt-1",
          barberId: "barber-1",
          guestClientId: "guest-1",
          rating: 5,
          comment: null,
        },
        include: expect.any(Object),
      });

      expect(result.guestClientId).toBe("guest-1");
    });
  });

  describe("getAppointmentFeedback", () => {
    it("returns null when no feedback exists", async () => {
      asMock(prisma.feedback.findUnique).mockResolvedValue(null);

      const result = await getAppointmentFeedback("appt-1");

      expect(result).toBeNull();
    });

    it("returns mapped feedback when exists", async () => {
      asMock(prisma.feedback.findUnique).mockResolvedValue(mockFeedbackData);

      const result = await getAppointmentFeedback("appt-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("feedback-1");
      expect(result?.createdAt).toBe("2025-01-20T10:00:00.000Z");
      expect(result?.appointment.date).toBe("2025-01-20");
    });
  });

  describe("getBarberFeedbacks", () => {
    it("returns paginated feedbacks", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([mockFeedbackData]);
      asMock(prisma.feedback.count).mockResolvedValue(15);

      const result = await getBarberFeedbacks("barber-1", 2, 10);

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { barberId: "barber-1" },
          skip: 10,
          take: 10,
          orderBy: { createdAt: "desc" },
        }),
      );

      expect(result.feedbacks).toHaveLength(1);
      expect(result.total).toBe(15);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(2);
    });

    it("uses default pagination values", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);
      asMock(prisma.feedback.count).mockResolvedValue(0);

      await getBarberFeedbacks("barber-1");

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe("getBarberFeedbackStats", () => {
    it("returns zero stats for no feedbacks", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);

      const result = await getBarberFeedbackStats("barber-1");

      expect(result.totalFeedbacks).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.ratingDistribution).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      });
    });

    it("calculates stats correctly", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
        { rating: 5 },
      ]);

      const result = await getBarberFeedbackStats("barber-1");

      expect(result.totalFeedbacks).toBe(5);
      expect(result.averageRating).toBe(4.4); // (5+5+4+3+5)/5 = 4.4
      expect(result.ratingDistribution).toEqual({
        1: 0,
        2: 0,
        3: 1,
        4: 1,
        5: 3,
      });
    });
  });

  describe("getAllFeedbacks", () => {
    it("returns paginated feedbacks without filters", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([mockFeedbackData]);
      asMock(prisma.feedback.count).mockResolvedValue(1);

      const result = await getAllFeedbacks();

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 20,
        }),
      );

      expect(result.feedbacks).toHaveLength(1);
    });

    it("applies barberId filter", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);
      asMock(prisma.feedback.count).mockResolvedValue(0);

      await getAllFeedbacks({ barberId: "barber-1" });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { barberId: "barber-1" },
        }),
      );
    });

    it("applies rating filter", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);
      asMock(prisma.feedback.count).mockResolvedValue(0);

      await getAllFeedbacks({ rating: 5 });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { rating: 5 },
        }),
      );
    });

    it("applies date range filters", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);
      asMock(prisma.feedback.count).mockResolvedValue(0);

      await getAllFeedbacks({
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: new Date("2025-01-01"),
              lte: new Date("2025-01-31"),
            },
          },
        }),
      );
    });

    it("applies hasComment true filter", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);
      asMock(prisma.feedback.count).mockResolvedValue(0);

      await getAllFeedbacks({ hasComment: true });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { comment: { not: null } },
        }),
      );
    });

    it("applies hasComment false filter", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);
      asMock(prisma.feedback.count).mockResolvedValue(0);

      await getAllFeedbacks({ hasComment: false });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { comment: null },
        }),
      );
    });

    it("applies pagination", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);
      asMock(prisma.feedback.count).mockResolvedValue(50);

      const result = await getAllFeedbacks({}, 3, 15);

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30,
          take: 15,
        }),
      );

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(15);
      expect(result.totalPages).toBe(4);
    });
  });

  describe("getOverallFeedbackStats", () => {
    it("returns stats for all feedbacks", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
      ]);

      const result = await getOverallFeedbackStats();

      expect(prisma.feedback.findMany).toHaveBeenCalledWith({
        select: { rating: true },
      });

      expect(result.totalFeedbacks).toBe(3);
      expect(result.averageRating).toBe(4.7); // (5+4+5)/3 = 4.67 -> 4.7
    });
  });

  describe("getBarberRanking", () => {
    it("returns empty array when no barbers", async () => {
      asMock(prisma.barber.findMany).mockResolvedValue([]);

      const result = await getBarberRanking();

      expect(result).toEqual([]);
    });

    it("returns ranking sorted by average then total", async () => {
      asMock(prisma.barber.findMany).mockResolvedValue([
        {
          id: "barber-1",
          name: "João",
          avatarUrl: null,
          feedbacks: [{ rating: 5 }, { rating: 5 }],
        },
        {
          id: "barber-2",
          name: "Pedro",
          avatarUrl: "/pedro.jpg",
          feedbacks: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
        },
        {
          id: "barber-3",
          name: "Carlos",
          avatarUrl: null,
          feedbacks: [{ rating: 5 }, { rating: 5 }],
        },
      ]);

      const result = await getBarberRanking();

      // João: avg 5.0, total 2
      // Pedro: avg 4.7, total 3
      // Carlos: avg 5.0, total 2
      // Order: João (5.0, 2), Carlos (5.0, 2), Pedro (4.7, 3)
      // Same avg -> sorted by total desc, but they're equal so original order preserved
      expect(result[0].barberName).toBe("João");
      expect(result[0].averageRating).toBe(5);
      expect(result[0].totalFeedbacks).toBe(2);

      expect(result[1].barberName).toBe("Carlos");
      expect(result[1].averageRating).toBe(5);

      expect(result[2].barberName).toBe("Pedro");
      expect(result[2].averageRating).toBe(4.7);
      expect(result[2].totalFeedbacks).toBe(3);
    });

    it("handles barber with no feedbacks", async () => {
      asMock(prisma.barber.findMany).mockResolvedValue([
        {
          id: "barber-1",
          name: "João",
          avatarUrl: null,
          feedbacks: [],
        },
        {
          id: "barber-2",
          name: "Pedro",
          avatarUrl: null,
          feedbacks: [{ rating: 5 }],
        },
      ]);

      const result = await getBarberRanking();

      // Pedro has feedbacks, João doesn't
      expect(result[0].barberName).toBe("Pedro");
      expect(result[0].averageRating).toBe(5);

      expect(result[1].barberName).toBe("João");
      expect(result[1].averageRating).toBe(0);
      expect(result[1].totalFeedbacks).toBe(0);
    });
  });

  describe("getBarberFeedbacksAdmin", () => {
    it("delegates to getBarberFeedbacks", async () => {
      asMock(prisma.feedback.findMany).mockResolvedValue([]);
      asMock(prisma.feedback.count).mockResolvedValue(0);

      const result = await getBarberFeedbacksAdmin("barber-1", 2, 15);

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { barberId: "barber-1" },
          skip: 15,
          take: 15,
        }),
      );

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(15);
    });
  });
});
