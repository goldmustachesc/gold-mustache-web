import { describe, expect, it, vi } from "vitest";
import { filterAppointments, isPastOrStarted } from "../appointment-filters";
import type { AppointmentWithDetails } from "@/types/booking";

vi.mock("@/utils/time-slots", () => ({
  getMinutesUntilAppointment: vi.fn(),
}));

import { getMinutesUntilAppointment } from "@/utils/time-slots";
const mockGetMinutes = vi.mocked(getMinutesUntilAppointment);

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    clientId: null,
    guestClientId: null,
    barberId: "b-1",
    serviceId: "s-1",
    date: "2026-03-10",
    startTime: "09:00",
    endTime: "09:30",
    status: "CONFIRMED",
    cancelReason: null,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
    service: {
      id: "s-1",
      name: "Corte",
      duration: 30,
      price: 50,
    },
    barber: { id: "b-1", name: "Carlos", avatarUrl: null },
    client: null,
    guestClient: null,
    ...overrides,
  } as AppointmentWithDetails;
}

describe("isPastOrStarted", () => {
  it("returns true when appointment is in the past", () => {
    mockGetMinutes.mockReturnValue(-30);
    const apt = buildAppointment();
    expect(isPastOrStarted(apt)).toBe(true);
  });

  it("returns true when appointment is starting now (0 minutes)", () => {
    mockGetMinutes.mockReturnValue(0);
    const apt = buildAppointment();
    expect(isPastOrStarted(apt)).toBe(true);
  });

  it("returns false when appointment is in the future", () => {
    mockGetMinutes.mockReturnValue(60);
    const apt = buildAppointment();
    expect(isPastOrStarted(apt)).toBe(false);
  });
});

describe("filterAppointments", () => {
  it("returns empty arrays when appointments is undefined", () => {
    const result = filterAppointments(undefined);
    expect(result.upcoming).toEqual([]);
    expect(result.history).toEqual([]);
  });

  it("returns empty arrays when appointments is empty", () => {
    const result = filterAppointments([]);
    expect(result.upcoming).toEqual([]);
    expect(result.history).toEqual([]);
  });

  it("puts confirmed future appointments in upcoming", () => {
    mockGetMinutes.mockReturnValue(120);
    const apt = buildAppointment({ id: "future-1", status: "CONFIRMED" });
    const result = filterAppointments([apt]);

    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0].id).toBe("future-1");
    expect(result.history).toHaveLength(0);
  });

  it("puts confirmed past appointments in history", () => {
    mockGetMinutes.mockReturnValue(-10);
    const apt = buildAppointment({ id: "past-1", status: "CONFIRMED" });
    const result = filterAppointments([apt]);

    expect(result.upcoming).toHaveLength(0);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].id).toBe("past-1");
  });

  it("puts cancelled appointments in history regardless of time", () => {
    mockGetMinutes.mockReturnValue(120);
    const apt = buildAppointment({
      id: "cancelled-1",
      status: "CANCELLED_BY_CLIENT",
    });
    const result = filterAppointments([apt]);

    expect(result.upcoming).toHaveLength(0);
    expect(result.history).toHaveLength(1);
  });

  it("puts completed appointments in history", () => {
    mockGetMinutes.mockReturnValue(-60);
    const apt = buildAppointment({ id: "done-1", status: "COMPLETED" });
    const result = filterAppointments([apt]);

    expect(result.upcoming).toHaveLength(0);
    expect(result.history).toHaveLength(1);
  });

  it("separates mixed appointments correctly", () => {
    mockGetMinutes
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(-30)
      .mockReturnValueOnce(60)
      .mockReturnValueOnce(200);

    const appointments = [
      buildAppointment({ id: "upcoming-1", status: "CONFIRMED" }),
      buildAppointment({ id: "past-1", status: "CONFIRMED" }),
      buildAppointment({ id: "upcoming-2", status: "CONFIRMED" }),
      buildAppointment({ id: "cancelled-1", status: "CANCELLED_BY_BARBER" }),
    ];

    const result = filterAppointments(appointments);
    expect(result.upcoming).toHaveLength(2);
    expect(result.history).toHaveLength(2);
  });
});
