import { describe, it, expect } from "vitest";
import { consolidateOperationalAppointments } from "../operational-appointments";
import type { AppointmentWithDetails } from "@/types/booking";

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
    service: { id: "s-1", name: "Corte", duration: 30, price: 50 },
    barber: { id: "b-1", name: "Carlos", avatarUrl: null },
    client: null,
    guestClient: null,
    ...overrides,
  } as AppointmentWithDetails;
}

describe("consolidateOperationalAppointments", () => {
  it("returns empty array for empty input", () => {
    expect(consolidateOperationalAppointments([])).toEqual([]);
  });

  it("returns single appointment unchanged", () => {
    const apt = buildAppointment();
    const result = consolidateOperationalAppointments([apt]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("apt-1");
  });

  it("deduplicates appointments with the same date+startTime slot", () => {
    const older = buildAppointment({
      id: "apt-old",
      updatedAt: "2026-03-01T08:00:00Z",
      createdAt: "2026-03-01T06:00:00Z",
    });
    const newer = buildAppointment({
      id: "apt-new",
      updatedAt: "2026-03-01T10:00:00Z",
      createdAt: "2026-03-01T07:00:00Z",
    });

    const result = consolidateOperationalAppointments([older, newer]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("apt-new");
  });

  it("keeps the more recently updated appointment when two share the same slot", () => {
    const first = buildAppointment({
      id: "first",
      updatedAt: "2026-03-02T09:00:00Z",
    });
    const second = buildAppointment({
      id: "second",
      updatedAt: "2026-03-02T12:00:00Z",
    });

    const result = consolidateOperationalAppointments([first, second]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("second");
  });

  it("uses createdAt as tiebreaker when updatedAt is identical", () => {
    const sameUpdated = "2026-03-02T09:00:00Z";
    const earlier = buildAppointment({
      id: "earlier",
      updatedAt: sameUpdated,
      createdAt: "2026-03-01T06:00:00Z",
    });
    const later = buildAppointment({
      id: "later",
      updatedAt: sameUpdated,
      createdAt: "2026-03-01T10:00:00Z",
    });

    const result = consolidateOperationalAppointments([earlier, later]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("later");
  });

  it("preserves distinct slots as separate entries", () => {
    const apt1 = buildAppointment({
      id: "apt-1",
      date: "2026-03-10",
      startTime: "09:00",
    });
    const apt2 = buildAppointment({
      id: "apt-2",
      date: "2026-03-10",
      startTime: "10:00",
    });
    const apt3 = buildAppointment({
      id: "apt-3",
      date: "2026-03-11",
      startTime: "09:00",
    });

    const result = consolidateOperationalAppointments([apt1, apt2, apt3]);

    expect(result).toHaveLength(3);
    const ids = result.map((a) => a.id);
    expect(ids).toContain("apt-1");
    expect(ids).toContain("apt-2");
    expect(ids).toContain("apt-3");
  });

  it("sorts output by date ascending, then by startTime ascending", () => {
    const apt1 = buildAppointment({
      id: "apt-1",
      date: "2026-03-12",
      startTime: "09:00",
    });
    const apt2 = buildAppointment({
      id: "apt-2",
      date: "2026-03-10",
      startTime: "14:00",
    });
    const apt3 = buildAppointment({
      id: "apt-3",
      date: "2026-03-10",
      startTime: "09:00",
    });

    const result = consolidateOperationalAppointments([apt1, apt2, apt3]);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("apt-3"); // 2026-03-10 09:00
    expect(result[1].id).toBe("apt-2"); // 2026-03-10 14:00
    expect(result[2].id).toBe("apt-1"); // 2026-03-12 09:00
  });

  it("handles multiple duplicates in the same slot — keeps latest updatedAt", () => {
    const a = buildAppointment({ id: "a", updatedAt: "2026-03-01T06:00:00Z" });
    const b = buildAppointment({ id: "b", updatedAt: "2026-03-01T08:00:00Z" });
    const c = buildAppointment({ id: "c", updatedAt: "2026-03-01T07:00:00Z" });

    const result = consolidateOperationalAppointments([a, b, c]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("treats same startTime on different dates as different slots", () => {
    const apt1 = buildAppointment({
      id: "apt-1",
      date: "2026-03-10",
      startTime: "09:00",
    });
    const apt2 = buildAppointment({
      id: "apt-2",
      date: "2026-03-11",
      startTime: "09:00",
    });

    const result = consolidateOperationalAppointments([apt1, apt2]);

    expect(result).toHaveLength(2);
  });

  it("treats same date with different startTimes as different slots", () => {
    const apt1 = buildAppointment({
      id: "apt-1",
      date: "2026-03-10",
      startTime: "09:00",
    });
    const apt2 = buildAppointment({
      id: "apt-2",
      date: "2026-03-10",
      startTime: "09:30",
    });

    const result = consolidateOperationalAppointments([apt1, apt2]);

    expect(result).toHaveLength(2);
  });

  it("correctly consolidates mixed scenario: duplicates and unique slots", () => {
    const slot1Old = buildAppointment({
      id: "s1-old",
      date: "2026-03-10",
      startTime: "09:00",
      updatedAt: "2026-03-01T06:00:00Z",
    });
    const slot1New = buildAppointment({
      id: "s1-new",
      date: "2026-03-10",
      startTime: "09:00",
      updatedAt: "2026-03-01T10:00:00Z",
    });
    const slot2 = buildAppointment({
      id: "s2",
      date: "2026-03-10",
      startTime: "10:00",
    });
    const slot3 = buildAppointment({
      id: "s3",
      date: "2026-03-11",
      startTime: "09:00",
    });

    const result = consolidateOperationalAppointments([
      slot1Old,
      slot1New,
      slot2,
      slot3,
    ]);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("s1-new");
    expect(result[1].id).toBe("s2");
    expect(result[2].id).toBe("s3");
  });
});
