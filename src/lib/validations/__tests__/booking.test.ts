import { describe, it, expect } from "vitest";
import {
  createAppointmentSchema,
  createGuestAppointmentSchema,
  cancelAppointmentByBarberSchema,
  createAppointmentByBarberSchema,
  workingHoursSchema,
  barberWorkingHoursDaySchema,
  updateBarberWorkingHoursSchema,
  barberAbsenceSchema,
  barberAbsenceCreateSchema,
  shopHoursDaySchema,
  updateShopHoursSchema,
  shopClosureSchema,
  getSlotsQuerySchema,
  dateRangeQuerySchema,
  getAppointmentsQuerySchema,
} from "../booking";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("lib/validations/booking", () => {
  describe("createAppointmentSchema", () => {
    const valid = {
      serviceId: VALID_UUID,
      barberId: VALID_UUID,
      date: "2026-03-10",
      startTime: "09:00",
    };

    it("should accept valid input", () => {
      expect(createAppointmentSchema.safeParse(valid).success).toBe(true);
    });

    it("should reject invalid serviceId", () => {
      const result = createAppointmentSchema.safeParse({
        ...valid,
        serviceId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("ID do serviço inválido");
      }
    });

    it("should reject invalid barberId", () => {
      const result = createAppointmentSchema.safeParse({
        ...valid,
        barberId: "bad",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("ID do barbeiro inválido");
      }
    });

    it("should reject invalid date format", () => {
      const result = createAppointmentSchema.safeParse({
        ...valid,
        date: "10/03/2026",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Data deve estar no formato YYYY-MM-DD",
        );
      }
    });

    it("should reject invalid startTime format", () => {
      const result = createAppointmentSchema.safeParse({
        ...valid,
        startTime: "9:00",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Horário deve estar no formato HH:MM",
        );
      }
    });

    it("should reject missing fields", () => {
      const result = createAppointmentSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createGuestAppointmentSchema", () => {
    const valid = {
      serviceId: VALID_UUID,
      barberId: VALID_UUID,
      date: "2026-03-10",
      startTime: "09:00",
      clientName: "João Silva",
      clientPhone: "11999999999",
    };

    it("should accept valid input", () => {
      expect(createGuestAppointmentSchema.safeParse(valid).success).toBe(true);
    });

    it("should accept 10-digit phone", () => {
      const result = createGuestAppointmentSchema.safeParse({
        ...valid,
        clientPhone: "1134567890",
      });
      expect(result.success).toBe(true);
    });

    it("should reject name shorter than 2 characters", () => {
      const result = createGuestAppointmentSchema.safeParse({
        ...valid,
        clientName: "A",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Nome deve ter pelo menos 2 caracteres",
        );
      }
    });

    it("should reject name longer than 100 characters", () => {
      const result = createGuestAppointmentSchema.safeParse({
        ...valid,
        clientName: "A".repeat(101),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Nome deve ter no máximo 100 caracteres",
        );
      }
    });

    it("should reject phone with fewer than 10 digits", () => {
      const result = createGuestAppointmentSchema.safeParse({
        ...valid,
        clientPhone: "123456789",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Telefone deve ter 10 ou 11 dígitos",
        );
      }
    });

    it("should reject phone with more than 11 digits", () => {
      const result = createGuestAppointmentSchema.safeParse({
        ...valid,
        clientPhone: "119999999999",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Telefone deve ter 10 ou 11 dígitos",
        );
      }
    });

    it("should reject phone with non-digit characters", () => {
      const result = createGuestAppointmentSchema.safeParse({
        ...valid,
        clientPhone: "(11) 99999-9999",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cancelAppointmentByBarberSchema", () => {
    const valid = {
      appointmentId: VALID_UUID,
      reason: "Cliente pediu para cancelar",
    };

    it("should accept valid input", () => {
      expect(cancelAppointmentByBarberSchema.safeParse(valid).success).toBe(
        true,
      );
    });

    it("should reject invalid appointmentId", () => {
      const result = cancelAppointmentByBarberSchema.safeParse({
        ...valid,
        appointmentId: "bad",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "ID do agendamento inválido",
        );
      }
    });

    it("should reject empty reason", () => {
      const result = cancelAppointmentByBarberSchema.safeParse({
        ...valid,
        reason: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Motivo é obrigatório");
      }
    });

    it("should reject reason longer than 500 characters", () => {
      const result = cancelAppointmentByBarberSchema.safeParse({
        ...valid,
        reason: "A".repeat(501),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Motivo deve ter no máximo 500 caracteres",
        );
      }
    });
  });

  describe("createAppointmentByBarberSchema", () => {
    const valid = {
      serviceId: VALID_UUID,
      date: "2026-03-10",
      startTime: "09:00",
      clientName: "João Silva",
      clientPhone: "11999999999",
    };

    it("should accept valid input", () => {
      expect(createAppointmentByBarberSchema.safeParse(valid).success).toBe(
        true,
      );
    });

    it("should reject invalid serviceId", () => {
      const result = createAppointmentByBarberSchema.safeParse({
        ...valid,
        serviceId: "bad",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short client name", () => {
      const result = createAppointmentByBarberSchema.safeParse({
        ...valid,
        clientName: "X",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid phone", () => {
      const result = createAppointmentByBarberSchema.safeParse({
        ...valid,
        clientPhone: "123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("workingHoursSchema", () => {
    const valid = {
      barberId: VALID_UUID,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "18:00",
    };

    it("should accept valid input without break", () => {
      expect(workingHoursSchema.safeParse(valid).success).toBe(true);
    });

    it("should accept valid input with break", () => {
      const result = workingHoursSchema.safeParse({
        ...valid,
        breakStart: "12:00",
        breakEnd: "13:00",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null break times", () => {
      const result = workingHoursSchema.safeParse({
        ...valid,
        breakStart: null,
        breakEnd: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject dayOfWeek out of range", () => {
      const result = workingHoursSchema.safeParse({ ...valid, dayOfWeek: 7 });
      expect(result.success).toBe(false);
    });

    it("should reject negative dayOfWeek", () => {
      const result = workingHoursSchema.safeParse({ ...valid, dayOfWeek: -1 });
      expect(result.success).toBe(false);
    });

    it("should reject endTime before startTime", () => {
      const result = workingHoursSchema.safeParse({
        ...valid,
        startTime: "18:00",
        endTime: "09:00",
      });
      expect(result.success).toBe(false);
    });

    it("should reject endTime equal to startTime", () => {
      const result = workingHoursSchema.safeParse({
        ...valid,
        startTime: "09:00",
        endTime: "09:00",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("barberWorkingHoursDaySchema", () => {
    it("should accept non-working day without times", () => {
      const result = barberWorkingHoursDaySchema.safeParse({
        dayOfWeek: 0,
        isWorking: false,
      });
      expect(result.success).toBe(true);
    });

    it("should accept working day with valid times", () => {
      const result = barberWorkingHoursDaySchema.safeParse({
        dayOfWeek: 1,
        isWorking: true,
        startTime: "09:00",
        endTime: "18:00",
      });
      expect(result.success).toBe(true);
    });

    it("should reject working day without times", () => {
      const result = barberWorkingHoursDaySchema.safeParse({
        dayOfWeek: 1,
        isWorking: true,
      });
      expect(result.success).toBe(false);
    });

    it("should reject working day with endTime before startTime", () => {
      const result = barberWorkingHoursDaySchema.safeParse({
        dayOfWeek: 1,
        isWorking: true,
        startTime: "18:00",
        endTime: "09:00",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateBarberWorkingHoursSchema", () => {
    it("should accept array of valid days", () => {
      const result = updateBarberWorkingHoursSchema.safeParse({
        days: [
          {
            dayOfWeek: 1,
            isWorking: true,
            startTime: "09:00",
            endTime: "18:00",
          },
          { dayOfWeek: 0, isWorking: false },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty array", () => {
      const result = updateBarberWorkingHoursSchema.safeParse({ days: [] });
      expect(result.success).toBe(false);
    });

    it("should reject array with more than 7 days", () => {
      const days = Array.from({ length: 8 }, (_, i) => ({
        dayOfWeek: i % 7,
        isWorking: false,
      }));
      const result = updateBarberWorkingHoursSchema.safeParse({ days });
      expect(result.success).toBe(false);
    });
  });

  describe("barberAbsenceSchema", () => {
    it("should accept full-day absence (no times)", () => {
      const result = barberAbsenceSchema.safeParse({
        date: "2026-03-15",
        reason: "Férias",
      });
      expect(result.success).toBe(true);
    });

    it("should accept partial absence with valid times", () => {
      const result = barberAbsenceSchema.safeParse({
        date: "2026-03-15",
        startTime: "09:00",
        endTime: "12:00",
      });
      expect(result.success).toBe(true);
    });

    it("should accept absence without reason", () => {
      const result = barberAbsenceSchema.safeParse({ date: "2026-03-15" });
      expect(result.success).toBe(true);
    });

    it("should accept autoCancelConflicts flag", () => {
      const result = barberAbsenceSchema.safeParse({
        date: "2026-03-15",
        autoCancelConflicts: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.autoCancelConflicts).toBe(true);
      }
    });

    it("should accept null reason", () => {
      const result = barberAbsenceSchema.safeParse({
        date: "2026-03-15",
        reason: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject partial absence with only startTime", () => {
      const result = barberAbsenceSchema.safeParse({
        date: "2026-03-15",
        startTime: "09:00",
      });
      expect(result.success).toBe(false);
    });

    it("should reject partial absence with only endTime", () => {
      const result = barberAbsenceSchema.safeParse({
        date: "2026-03-15",
        endTime: "12:00",
      });
      expect(result.success).toBe(false);
    });

    it("should reject partial absence with endTime before startTime", () => {
      const result = barberAbsenceSchema.safeParse({
        date: "2026-03-15",
        startTime: "12:00",
        endTime: "09:00",
      });
      expect(result.success).toBe(false);
    });

    it("should reject reason longer than 500 characters", () => {
      const result = barberAbsenceSchema.safeParse({
        date: "2026-03-15",
        reason: "A".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const result = barberAbsenceSchema.safeParse({ date: "15/03/2026" });
      expect(result.success).toBe(false);
    });
  });

  describe("barberAbsenceCreateSchema", () => {
    it("should accept recurring absence with end date", () => {
      const result = barberAbsenceCreateSchema.safeParse({
        date: "2026-03-15",
        recurrence: {
          frequency: "WEEKLY",
          interval: 2,
          endsAt: "2026-04-15",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept recurring absence with occurrence count", () => {
      const result = barberAbsenceCreateSchema.safeParse({
        date: "2026-03-15",
        recurrence: {
          frequency: "DAILY",
          interval: 1,
          occurrenceCount: 5,
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject recurrence without end date or occurrence count", () => {
      const result = barberAbsenceCreateSchema.safeParse({
        date: "2026-03-15",
        recurrence: {
          frequency: "MONTHLY",
          interval: 1,
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject recurrence with both end date and occurrence count", () => {
      const result = barberAbsenceCreateSchema.safeParse({
        date: "2026-03-15",
        recurrence: {
          frequency: "MONTHLY",
          interval: 1,
          endsAt: "2026-04-15",
          occurrenceCount: 4,
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject recurrence ending before start date", () => {
      const result = barberAbsenceCreateSchema.safeParse({
        date: "2026-03-15",
        recurrence: {
          frequency: "WEEKLY",
          interval: 1,
          endsAt: "2026-03-10",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject daily recurrence with more than 365 occurrences by end date", () => {
      const result = barberAbsenceCreateSchema.safeParse({
        date: "2026-01-01",
        recurrence: {
          frequency: "DAILY",
          interval: 1,
          endsAt: "2027-01-01",
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject recurrence ending beyond the supported horizon", () => {
      const result = barberAbsenceCreateSchema.safeParse({
        date: "2026-01-01",
        recurrence: {
          frequency: "DAILY",
          interval: 1,
          endsAt: "2027-02-01",
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("shopHoursDaySchema", () => {
    it("should accept closed day without times", () => {
      const result = shopHoursDaySchema.safeParse({
        dayOfWeek: 0,
        isOpen: false,
      });
      expect(result.success).toBe(true);
    });

    it("should accept open day with valid times", () => {
      const result = shopHoursDaySchema.safeParse({
        dayOfWeek: 1,
        isOpen: true,
        startTime: "09:00",
        endTime: "18:00",
      });
      expect(result.success).toBe(true);
    });

    it("should accept open day with break", () => {
      const result = shopHoursDaySchema.safeParse({
        dayOfWeek: 1,
        isOpen: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      });
      expect(result.success).toBe(true);
    });

    it("should reject open day without times", () => {
      const result = shopHoursDaySchema.safeParse({
        dayOfWeek: 1,
        isOpen: true,
      });
      expect(result.success).toBe(false);
    });

    it("should reject open day with endTime before startTime", () => {
      const result = shopHoursDaySchema.safeParse({
        dayOfWeek: 1,
        isOpen: true,
        startTime: "18:00",
        endTime: "09:00",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateShopHoursSchema", () => {
    it("should accept array of valid days", () => {
      const result = updateShopHoursSchema.safeParse({
        days: [
          { dayOfWeek: 1, isOpen: true, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 0, isOpen: false },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty array", () => {
      const result = updateShopHoursSchema.safeParse({ days: [] });
      expect(result.success).toBe(false);
    });

    it("should reject array with more than 7 items", () => {
      const days = Array.from({ length: 8 }, (_, i) => ({
        dayOfWeek: i % 7,
        isOpen: false,
      }));
      const result = updateShopHoursSchema.safeParse({ days });
      expect(result.success).toBe(false);
    });
  });

  describe("shopClosureSchema", () => {
    it("should accept full-day closure (no times)", () => {
      const result = shopClosureSchema.safeParse({
        date: "2026-12-25",
        reason: "Natal",
      });
      expect(result.success).toBe(true);
    });

    it("should accept partial closure with valid times", () => {
      const result = shopClosureSchema.safeParse({
        date: "2026-12-24",
        startTime: "12:00",
        endTime: "18:00",
      });
      expect(result.success).toBe(true);
    });

    it("should accept closure without reason", () => {
      const result = shopClosureSchema.safeParse({ date: "2026-12-25" });
      expect(result.success).toBe(true);
    });

    it("should reject partial closure with only startTime", () => {
      const result = shopClosureSchema.safeParse({
        date: "2026-12-24",
        startTime: "12:00",
      });
      expect(result.success).toBe(false);
    });

    it("should reject partial closure with endTime before startTime", () => {
      const result = shopClosureSchema.safeParse({
        date: "2026-12-24",
        startTime: "18:00",
        endTime: "12:00",
      });
      expect(result.success).toBe(false);
    });

    it("should reject reason longer than 500 characters", () => {
      const result = shopClosureSchema.safeParse({
        date: "2026-12-25",
        reason: "A".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("getSlotsQuerySchema", () => {
    const valid = {
      date: "2026-03-10",
      barberId: VALID_UUID,
      serviceId: VALID_UUID,
    };

    it("should accept valid input", () => {
      expect(getSlotsQuerySchema.safeParse(valid).success).toBe(true);
    });

    it("should reject invalid date", () => {
      const result = getSlotsQuerySchema.safeParse({
        ...valid,
        date: "bad-date",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid barberId", () => {
      const result = getSlotsQuerySchema.safeParse({
        ...valid,
        barberId: "bad",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid serviceId", () => {
      const result = getSlotsQuerySchema.safeParse({
        ...valid,
        serviceId: "bad",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
      const result = getSlotsQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("dateRangeQuerySchema", () => {
    it("should accept empty input (both optional)", () => {
      expect(dateRangeQuerySchema.safeParse({}).success).toBe(true);
    });

    it("should accept only startDate", () => {
      expect(
        dateRangeQuerySchema.safeParse({ startDate: "2026-03-01" }).success,
      ).toBe(true);
    });

    it("should accept only endDate", () => {
      expect(
        dateRangeQuerySchema.safeParse({ endDate: "2026-03-31" }).success,
      ).toBe(true);
    });

    it("should accept valid range", () => {
      const result = dateRangeQuerySchema.safeParse({
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      });
      expect(result.success).toBe(true);
    });

    it("should accept same startDate and endDate", () => {
      const result = dateRangeQuerySchema.safeParse({
        startDate: "2026-03-01",
        endDate: "2026-03-01",
      });
      expect(result.success).toBe(true);
    });

    it("should reject endDate before startDate", () => {
      const result = dateRangeQuerySchema.safeParse({
        startDate: "2026-03-31",
        endDate: "2026-03-01",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path.includes("endDate"));
        expect(err?.message).toBe(
          "endDate deve ser igual ou posterior a startDate",
        );
      }
    });

    it("should reject invalid date format", () => {
      const result = dateRangeQuerySchema.safeParse({
        startDate: "03-01-2026",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("getAppointmentsQuerySchema", () => {
    it("should accept empty input", () => {
      expect(getAppointmentsQuerySchema.safeParse({}).success).toBe(true);
    });

    it("should accept valid range with barberId", () => {
      const result = getAppointmentsQuerySchema.safeParse({
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        barberId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("should accept only barberId", () => {
      const result = getAppointmentsQuerySchema.safeParse({
        barberId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid barberId", () => {
      const result = getAppointmentsQuerySchema.safeParse({
        barberId: "bad",
      });
      expect(result.success).toBe(false);
    });

    it("should reject endDate before startDate", () => {
      const result = getAppointmentsQuerySchema.safeParse({
        startDate: "2026-03-31",
        endDate: "2026-03-01",
      });
      expect(result.success).toBe(false);
    });
  });
});
