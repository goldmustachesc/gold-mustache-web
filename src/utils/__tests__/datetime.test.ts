import { describe, it, expect } from "vitest";
import {
  SAO_PAULO_TIMEZONE,
  formatDateDdMmYyyyFromIsoDateLike,
  formatDateDdMmYyyyInSaoPaulo,
  formatTimeHHmmInSaoPaulo,
  formatDateTimeDdMmYyyyHHmmInSaoPaulo,
  formatIsoDateYyyyMmDdInSaoPaulo,
  parseDateDdMmYyyyToIsoDate,
  parseIsoDateYyyyMmDdAsSaoPauloDate,
  formatLocalizedDateFromIsoDateLike,
} from "../datetime";

describe("utils/datetime", () => {
  it("formatDateDdMmYyyyFromIsoDateLike formats date-only safely", () => {
    expect(formatDateDdMmYyyyFromIsoDateLike("2025-01-02")).toBe("02-01-2025");
    expect(formatDateDdMmYyyyFromIsoDateLike("2025-01-02T10:30:00.000Z")).toBe(
      "02-01-2025",
    );
    expect(formatDateDdMmYyyyFromIsoDateLike("invalid")).toBe("invalid");
  });

  it("formats date/time in Sao Paulo timezone", () => {
    // 2025-01-02T03:45Z == 2025-01-02 00:45 in America/Sao_Paulo (UTC-3)
    const date = new Date(Date.UTC(2025, 0, 2, 3, 45, 0, 0));
    expect(formatDateDdMmYyyyInSaoPaulo(date)).toBe("02-01-2025");
    expect(formatTimeHHmmInSaoPaulo(date)).toBe("00:45");
    expect(formatDateTimeDdMmYyyyHHmmInSaoPaulo(date)).toBe("02-01-2025 00:45");
  });

  it("formatIsoDateYyyyMmDdInSaoPaulo keeps the São Paulo calendar day", () => {
    // 2025-01-02T01:00Z == 2025-01-01 22:00 in Sao Paulo -> previous day
    const date = new Date(Date.UTC(2025, 0, 2, 1, 0, 0, 0));
    expect(formatIsoDateYyyyMmDdInSaoPaulo(date)).toBe("2025-01-01");

    const sameDay = new Date(Date.UTC(2025, 0, 2, 12, 0, 0, 0));
    expect(formatIsoDateYyyyMmDdInSaoPaulo(sameDay)).toBe("2025-01-02");
  });

  it("parseDateDdMmYyyyToIsoDate parses the display format", () => {
    expect(parseDateDdMmYyyyToIsoDate("02-01-2025")).toBe("2025-01-02");
    expect(parseDateDdMmYyyyToIsoDate("2-1-2025")).toBe(null);
  });

  it("parseIsoDateYyyyMmDdAsSaoPauloDate returns a stable UTC-noon date", () => {
    const date = parseIsoDateYyyyMmDdAsSaoPauloDate("2025-01-02");
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(2);
    expect(date.getUTCHours()).toBe(12);
    expect(date.getUTCMinutes()).toBe(0);
  });

  it("formatLocalizedDateFromIsoDateLike matches Intl.DateTimeFormat with Sao Paulo timezone", () => {
    const locale = "en-US";
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    const input = "2025-01-02T00:00:00.000Z";
    const expected = new Intl.DateTimeFormat(locale, {
      timeZone: SAO_PAULO_TIMEZONE,
      ...options,
    }).format(parseIsoDateYyyyMmDdAsSaoPauloDate("2025-01-02"));

    expect(formatLocalizedDateFromIsoDateLike(input, locale, options)).toBe(
      expected,
    );
  });

  it("formatDateDdMmYyyyFromIsoDateLike handles edge cases with incomplete parts", () => {
    // Empty parts should return original input
    expect(formatDateDdMmYyyyFromIsoDateLike("")).toBe("");
    expect(formatDateDdMmYyyyFromIsoDateLike("2025")).toBe("2025");
    expect(formatDateDdMmYyyyFromIsoDateLike("2025-01")).toBe("2025-01");
  });

  it("formatDateDdMmYyyyFromIsoDateLike pads single-digit day/month", () => {
    // The split should handle dates that might not be zero-padded
    expect(formatDateDdMmYyyyFromIsoDateLike("2025-1-2")).toBe("02-01-2025");
  });

  it("handles dates at various times of day in São Paulo", () => {
    // Test early morning UTC (still previous day in São Paulo during DST)
    const earlyUTC = new Date(Date.UTC(2025, 5, 15, 2, 0, 0, 0)); // 02:00 UTC = 23:00 BRT previous day
    expect(formatDateDdMmYyyyInSaoPaulo(earlyUTC)).toBe("14-06-2025");

    // Test late night in São Paulo
    const lateUTC = new Date(Date.UTC(2025, 5, 15, 23, 30, 0, 0)); // 23:30 UTC = 20:30 BRT same day
    expect(formatTimeHHmmInSaoPaulo(lateUTC)).toBe("20:30");
  });
});
