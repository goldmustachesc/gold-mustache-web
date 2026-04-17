import { describe, it, expect } from "vitest";
import { listAdminAppointmentsQuerySchema } from "../admin-appointments";

describe("listAdminAppointmentsQuerySchema", () => {
  it("applies defaults when empty input", () => {
    const result = listAdminAppointmentsQuerySchema.parse({});
    expect(result.orderBy).toBe("date");
    expect(result.orderDir).toBe("desc");
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("accepts valid date strings", () => {
    const result = listAdminAppointmentsQuerySchema.parse({
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });
    expect(result.startDate).toBe("2026-04-01");
    expect(result.endDate).toBe("2026-04-30");
  });

  it("rejects invalid date format", () => {
    expect(() =>
      listAdminAppointmentsQuerySchema.parse({ startDate: "01-04-2026" }),
    ).toThrow();
    expect(() =>
      listAdminAppointmentsQuerySchema.parse({ startDate: "2026/04/01" }),
    ).toThrow();
  });

  it("accepts valid UUID as barberId", () => {
    const result = listAdminAppointmentsQuerySchema.parse({
      barberId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.barberId).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("rejects non-UUID barberId", () => {
    expect(() =>
      listAdminAppointmentsQuerySchema.parse({ barberId: "not-a-uuid" }),
    ).toThrow();
  });

  it("accepts all valid status values", () => {
    const statuses = [
      "CONFIRMED",
      "CANCELLED_BY_CLIENT",
      "CANCELLED_BY_BARBER",
      "COMPLETED",
      "NO_SHOW",
    ] as const;
    for (const status of statuses) {
      const result = listAdminAppointmentsQuerySchema.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it("rejects invalid status", () => {
    expect(() =>
      listAdminAppointmentsQuerySchema.parse({ status: "PENDING" }),
    ).toThrow();
  });

  it("rejects limit above max 100", () => {
    expect(() =>
      listAdminAppointmentsQuerySchema.parse({ limit: "200" }),
    ).toThrow();
  });

  it("coerces page and limit from strings", () => {
    const result = listAdminAppointmentsQuerySchema.parse({
      page: "2",
      limit: "50",
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it("rejects q longer than 100 chars", () => {
    expect(() =>
      listAdminAppointmentsQuerySchema.parse({ q: "a".repeat(101) }),
    ).toThrow();
  });

  it("accepts q up to 100 chars", () => {
    const q = "a".repeat(100);
    expect(listAdminAppointmentsQuerySchema.parse({ q }).q).toBe(q);
  });

  it("accepts all valid orderBy values", () => {
    for (const orderBy of ["date", "startTime", "createdAt", "status"]) {
      const result = listAdminAppointmentsQuerySchema.parse({ orderBy });
      expect(result.orderBy).toBe(orderBy);
    }
  });

  it("rejects invalid orderBy", () => {
    expect(() =>
      listAdminAppointmentsQuerySchema.parse({ orderBy: "price" }),
    ).toThrow();
  });
});
