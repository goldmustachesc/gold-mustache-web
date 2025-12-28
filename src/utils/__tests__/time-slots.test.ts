import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { TimeSlot } from "@/types/booking";
import { parseIsoDateYyyyMmDdAsSaoPauloDate } from "@/utils/datetime";
import {
  parseDateString,
  formatPrismaDateToString,
  parseTimeToMinutes,
  minutesToTime,
  addMinutesToTime,
  isInBreakPeriod,
  generateTimeSlots,
  filterAvailableSlots,
  getAvailableSlots,
  getBrazilDateString,
  getMinutesUntilAppointment,
  getTodayUTCMidnight,
  parseDateStringToUTC,
  isToday,
  getCurrentTimeInMinutes,
  filterPastSlots,
  isDateTimeInPast,
} from "../time-slots";

describe("utils/time-slots (deterministic unit tests)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses and formats basic time helpers", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("01:15")).toBe(75);
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(75)).toBe("01:15");
    expect(addMinutesToTime("09:30", 45)).toBe("10:15");
  });

  it("isInBreakPeriod handles nulls and boundaries", () => {
    expect(isInBreakPeriod("12:00", null, null)).toBe(false);
    expect(isInBreakPeriod("12:00", "12:00", "13:00")).toBe(true);
    expect(isInBreakPeriod("12:59", "12:00", "13:00")).toBe(true);
    expect(isInBreakPeriod("13:00", "12:00", "13:00")).toBe(false);
  });

  it("generateTimeSlots skips breaks and slots that cross into the break", () => {
    const slots = generateTimeSlots({
      startTime: "11:00",
      endTime: "14:00",
      duration: 60,
      breakStart: "12:00",
      breakEnd: "13:00",
    });

    expect(slots.map((s) => s.time)).toEqual(["11:00", "13:00"]);

    const crossBreak = generateTimeSlots({
      startTime: "11:00",
      endTime: "13:00",
      duration: 90,
      breakStart: "12:00",
      breakEnd: "13:00",
    });

    // 11:00-12:30 crosses break start -> skipped, and no other slot fits
    expect(crossBreak).toEqual([]);
  });

  it("filterAvailableSlots respects service duration overlaps", () => {
    const slots: TimeSlot[] = [
      { time: "10:00", available: true },
      { time: "10:30", available: true },
      { time: "11:00", available: true },
      { time: "11:30", available: true },
    ];

    const existing = [
      { startTime: "10:30", endTime: "11:30", status: "CONFIRMED" },
    ];

    const filtered = filterAvailableSlots(slots, existing, 60);
    const availability = Object.fromEntries(
      filtered.map((s) => [s.time, s.available]),
    );

    // Slot 10:00 (10:00-11:00) overlaps 10:30-11:30
    expect(availability["10:00"]).toBe(false);
    // Slot 10:30 obviously overlaps
    expect(availability["10:30"]).toBe(false);
    // Slot 11:00 (11:00-12:00) overlaps 10:30-11:30
    expect(availability["11:00"]).toBe(false);
    // Slot 11:30 (11:30-12:30) does NOT overlap (boundary)
    expect(availability["11:30"]).toBe(true);

    expect(getAvailableSlots(filtered).map((s) => s.time)).toEqual(["11:30"]);
  });

  it("date helpers handle UTC vs local correctly", () => {
    const local = parseDateString("2025-01-02");
    expect(local.getFullYear()).toBe(2025);
    expect(local.getMonth()).toBe(0);
    expect(local.getDate()).toBe(2);

    const utc = parseDateStringToUTC("2025-01-02");
    expect(formatPrismaDateToString(utc)).toBe("2025-01-02");
    expect(utc.getUTCHours()).toBe(0);
  });

  it("Brazil date/time helpers are deterministic with fake timers", () => {
    // 2025-01-02T03:15Z == 2025-01-02 00:15 in Sao Paulo
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 3, 15, 0, 0)));

    expect(getBrazilDateString()).toBe("2025-01-02");
    expect(getCurrentTimeInMinutes()).toBe(15);
    expect(getTodayUTCMidnight().toISOString()).toBe(
      "2025-01-02T00:00:00.000Z",
    );

    expect(getMinutesUntilAppointment("2025-01-02", "01:15")).toBe(60);
    expect(getMinutesUntilAppointment("2025-01-02", "00:10")).toBe(-5);

    const today = parseIsoDateYyyyMmDdAsSaoPauloDate("2025-01-02");
    expect(isToday(today)).toBe(true);
    expect(isToday(parseIsoDateYyyyMmDdAsSaoPauloDate("2025-01-03"))).toBe(
      false,
    );

    const slots: TimeSlot[] = [
      { time: "00:00", available: true },
      { time: "00:30", available: true },
    ];
    const filtered = filterPastSlots(slots, today);
    expect(filtered.find((s) => s.time === "00:00")?.available).toBe(false);
    expect(filtered.find((s) => s.time === "00:30")?.available).toBe(true);
  });

  it("filterPastSlots returns slots unchanged when date is not today", () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 3, 15, 0, 0))); // 00:15 BRT
    const notToday = parseIsoDateYyyyMmDdAsSaoPauloDate("2025-01-03");
    const slots: TimeSlot[] = [{ time: "10:00", available: true }];

    const result = filterPastSlots(slots, notToday);
    expect(result).toBe(slots);
  });

  it("getMinutesUntilAppointment handles cross-month (Jan 31 -> Feb 1)", () => {
    // 2025-02-01T02:30Z == 2025-01-31 23:30 in Sao Paulo
    vi.setSystemTime(new Date(Date.UTC(2025, 1, 1, 2, 30, 0, 0)));
    expect(getBrazilDateString()).toBe("2025-01-31");

    // 00:30 on Feb 1 is 60 minutes after 23:30 on Jan 31
    expect(getMinutesUntilAppointment("2025-02-01", "00:30")).toBe(60);
  });

  it("filterAvailableSlots works when serviceDuration is not provided (start-point check)", () => {
    const slots: TimeSlot[] = [
      { time: "10:00", available: true },
      { time: "10:30", available: true },
    ];

    const existing = [
      { startTime: "10:00", endTime: "10:30", status: "CONFIRMED" },
    ];
    const filtered = filterAvailableSlots(slots, existing);

    expect(filtered.find((s) => s.time === "10:00")?.available).toBe(false);
    expect(filtered.find((s) => s.time === "10:30")?.available).toBe(true);
  });

  it("isDateTimeInPast respects Brazil time (<= is past)", () => {
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 2, 3, 15, 0, 0))); // 00:15 BRT

    const todayLocal = parseDateString("2025-01-02");
    expect(isDateTimeInPast(todayLocal, "00:15")).toBe(true);
    expect(isDateTimeInPast(todayLocal, "00:16")).toBe(false);

    const yesterdayLocal = parseDateString("2025-01-01");
    expect(isDateTimeInPast(yesterdayLocal, "23:59")).toBe(true);

    const nextYearLocal = parseDateString("2026-01-02");
    expect(isDateTimeInPast(nextYearLocal, "00:00")).toBe(false);
  });

  it("isDateTimeInPast covers all year/month/day branches", () => {
    // Set current time to 2025-06-15 12:00 BRT (15:00 UTC)
    vi.setSystemTime(new Date(Date.UTC(2025, 5, 15, 15, 0, 0, 0)));

    // Branch: appointmentYear < brazilDate.year -> true (past year)
    expect(isDateTimeInPast(parseDateString("2024-06-15"), "12:00")).toBe(true);

    // Branch: appointmentYear > brazilDate.year -> false (future year)
    expect(isDateTimeInPast(parseDateString("2026-06-15"), "12:00")).toBe(
      false,
    );

    // Branch: same year, appointmentMonth < brazilDate.month -> true (past month)
    expect(isDateTimeInPast(parseDateString("2025-05-15"), "12:00")).toBe(true);

    // Branch: same year, appointmentMonth > brazilDate.month -> false (future month)
    expect(isDateTimeInPast(parseDateString("2025-07-15"), "12:00")).toBe(
      false,
    );

    // Branch: same year/month, appointmentDay < brazilDate.day -> true (past day)
    expect(isDateTimeInPast(parseDateString("2025-06-14"), "12:00")).toBe(true);

    // Branch: same year/month, appointmentDay > brazilDate.day -> false (future day)
    expect(isDateTimeInPast(parseDateString("2025-06-16"), "12:00")).toBe(
      false,
    );
  });
});
