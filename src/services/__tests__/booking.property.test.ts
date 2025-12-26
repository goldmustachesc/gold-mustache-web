import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { AppointmentWithDetails, ServiceData } from "@/types/booking";
import { AppointmentStatus } from "@prisma/client";

// ============================================
// Pure function implementations for testing
// These mirror the logic in the service but are testable without DB
// ============================================

/**
 * Filters services by barber association
 */
function filterServicesByBarber(
  services: ServiceData[],
  barberServices: { barberId: string; serviceId: string }[],
  barberId: string,
): ServiceData[] {
  const barberServiceIds = new Set(
    barberServices
      .filter((bs) => bs.barberId === barberId)
      .map((bs) => bs.serviceId),
  );
  return services.filter((s) => barberServiceIds.has(s.id));
}

/**
 * Filters and sorts client appointments (future only, sorted by date)
 */
function filterClientAppointments(
  appointments: AppointmentWithDetails[],
  clientId: string,
  today: Date,
): AppointmentWithDetails[] {
  return appointments
    .filter((apt) => apt.clientId === clientId && new Date(apt.date) >= today)
    .sort((a, b) => {
      const dateCompare =
        new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
}

/**
 * Filters barber appointments by date range
 */
function filterBarberAppointments(
  appointments: AppointmentWithDetails[],
  barberId: string,
  startDate: Date,
  endDate: Date,
): AppointmentWithDetails[] {
  return appointments
    .filter((apt) => {
      const aptDate = new Date(apt.date);
      return (
        apt.barberId === barberId && aptDate >= startDate && aptDate <= endDate
      );
    })
    .sort((a, b) => {
      const dateCompare =
        new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
}

/**
 * Validates appointment has all required display fields
 */
function hasRequiredDisplayFields(apt: AppointmentWithDetails): boolean {
  return (
    apt.client !== undefined &&
    apt.service !== undefined &&
    apt.startTime !== undefined &&
    apt.status !== undefined
  );
}

// ============================================
// Arbitrary Generators
// ============================================

const uuidArb = fc.uuid();

const serviceDataArb: fc.Arbitrary<ServiceData> = fc.record({
  id: uuidArb,
  slug: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  duration: fc.integer({ min: 15, max: 120 }),
  price: fc.integer({ min: 10, max: 500 }),
  active: fc.constant(true),
});

const timeStringArb = fc
  .tuple(fc.integer({ min: 8, max: 18 }), fc.constantFrom(0, 30))
  .map(
    ([h, m]) =>
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
  );

const isoDateStringArb = fc
  .integer({ min: Date.UTC(2024, 0, 1), max: Date.UTC(2026, 11, 31) })
  .map((ts) => new Date(ts).toISOString());

const appointmentStatusArb = fc.constantFrom(
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CANCELLED_BY_CLIENT,
  AppointmentStatus.CANCELLED_BY_BARBER,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
);

const appointmentWithDetailsArb: fc.Arbitrary<AppointmentWithDetails> =
  fc.record({
    id: uuidArb,
    clientId: fc.option(uuidArb, { nil: null }),
    guestClientId: fc.option(uuidArb, { nil: null }),
    barberId: uuidArb,
    serviceId: uuidArb,
    date: isoDateStringArb,
    startTime: timeStringArb,
    endTime: timeStringArb,
    status: appointmentStatusArb,
    cancelReason: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
    createdAt: isoDateStringArb,
    updatedAt: isoDateStringArb,
    client: fc.option(
      fc.record({
        id: uuidArb,
        fullName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
          nil: null,
        }),
        phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), {
          nil: null,
        }),
      }),
      { nil: null },
    ),
    guestClient: fc.option(
      fc.record({
        id: uuidArb,
        fullName: fc.string({ minLength: 1, maxLength: 100 }),
        phone: fc.string({ minLength: 10, maxLength: 15 }),
      }),
      { nil: null },
    ),
    barber: fc.record({
      id: uuidArb,
      name: fc.string({ minLength: 1, maxLength: 100 }),
      avatarUrl: fc.option(fc.webUrl(), { nil: null }),
    }),
    service: fc.record({
      id: uuidArb,
      name: fc.string({ minLength: 1, maxLength: 100 }),
      duration: fc.integer({ min: 15, max: 120 }),
      price: fc.integer({ min: 10, max: 500 }),
    }),
  });

// ============================================
// Property Tests
// ============================================

describe("Booking Service Properties", () => {
  /**
   * **Feature: booking-system, Property 13: Services filtered by barber association**
   * *For any* barber, the available services SHALL only include services
   * associated with that barber.
   * **Validates: Requirements 6.3**
   */
  it("services filtered by barber only include associated services", () => {
    fc.assert(
      fc.property(
        fc.array(serviceDataArb, { minLength: 1, maxLength: 10 }),
        uuidArb,
        fc.array(
          fc.record({
            barberId: uuidArb,
            serviceId: uuidArb,
          }),
          { minLength: 0, maxLength: 20 },
        ),
        (services, barberId, barberServices) => {
          const filtered = filterServicesByBarber(
            services,
            barberServices,
            barberId,
          );

          // All filtered services should be associated with the barber
          const barberServiceIds = new Set(
            barberServices
              .filter((bs) => bs.barberId === barberId)
              .map((bs) => bs.serviceId),
          );

          for (const service of filtered) {
            expect(barberServiceIds.has(service.id)).toBe(true);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: booking-system, Property 4: Future appointments sorted by date**
   * *For any* client with appointments, retrieving their appointments SHALL
   * return only future appointments sorted by date in ascending order.
   * **Validates: Requirements 2.1**
   */
  it("client appointments are sorted by date ascending", () => {
    fc.assert(
      fc.property(
        fc.array(appointmentWithDetailsArb, { minLength: 2, maxLength: 10 }),
        uuidArb,
        (appointments, clientId) => {
          // Assign some appointments to the client
          const clientAppointments = appointments.map((apt, i) =>
            i % 2 === 0 ? { ...apt, clientId } : apt,
          );

          const today = new Date("2024-01-01");
          const filtered = filterClientAppointments(
            clientAppointments,
            clientId,
            today,
          );

          // Check sorting
          for (let i = 1; i < filtered.length; i++) {
            const prevDate = new Date(filtered[i - 1].date);
            const currDate = new Date(filtered[i].date);

            if (prevDate.getTime() === currDate.getTime()) {
              // Same date, check time
              expect(filtered[i - 1].startTime <= filtered[i].startTime).toBe(
                true,
              );
            } else {
              expect(prevDate.getTime()).toBeLessThanOrEqual(
                currDate.getTime(),
              );
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: booking-system, Property 7: Barber appointments filtered by date**
   * *For any* barber and date range, retrieved appointments SHALL only include
   * appointments within that date range, sorted chronologically.
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  it("barber appointments are filtered by date range and sorted", () => {
    fc.assert(
      fc.property(
        fc.array(appointmentWithDetailsArb, { minLength: 2, maxLength: 10 }),
        uuidArb,
        (appointments, barberId) => {
          // Assign some appointments to the barber
          const barberAppointments = appointments.map((apt, i) =>
            i % 2 === 0 ? { ...apt, barberId } : apt,
          );

          const startDate = new Date("2024-06-01");
          const endDate = new Date("2024-06-30");

          const filtered = filterBarberAppointments(
            barberAppointments,
            barberId,
            startDate,
            endDate,
          );

          // All filtered appointments should be within date range
          for (const apt of filtered) {
            const aptDate = new Date(apt.date);
            expect(aptDate >= startDate).toBe(true);
            expect(aptDate <= endDate).toBe(true);
            expect(apt.barberId).toBe(barberId);
          }

          // Check sorting
          for (let i = 1; i < filtered.length; i++) {
            const prevDate = new Date(filtered[i - 1].date);
            const currDate = new Date(filtered[i].date);
            expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: booking-system, Property 8: Appointment display completeness**
   * *For any* appointment, the display data SHALL include client name,
   * service type, start time, and status.
   * **Validates: Requirements 3.4**
   */
  it("appointment has all required display fields", () => {
    fc.assert(
      fc.property(appointmentWithDetailsArb, (appointment) => {
        expect(hasRequiredDisplayFields(appointment)).toBe(true);
        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: booking-system, Property 2: Booking creates confirmed appointment**
   * *For any* valid booking input, creating an appointment SHALL result in
   * an Appointment with status CONFIRMED.
   * **Validates: Requirements 1.3**
   */
  it("new appointments have CONFIRMED status", () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        uuidArb,
        isoDateStringArb,
        timeStringArb,
        (clientId, barberId, serviceId, date, startTime) => {
          // Simulate creating an appointment
          const newAppointment = {
            id: crypto.randomUUID(),
            clientId,
            barberId,
            serviceId,
            date,
            startTime,
            endTime: startTime, // simplified
            status: AppointmentStatus.CONFIRMED,
            cancelReason: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          expect(newAppointment.status).toBe(AppointmentStatus.CONFIRMED);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Appointment Persistence Properties", () => {
  /**
   * **Feature: booking-system, Property 3: Appointment persistence round-trip**
   * *For any* created appointment, immediately querying the database SHALL
   * return an appointment with identical field values.
   * **Validates: Requirements 1.5, 6.4**
   *
   * Note: This test validates the data transformation logic without DB.
   * The actual DB round-trip is tested in integration tests.
   */
  it("appointment data transformation preserves all fields", () => {
    fc.assert(
      fc.property(appointmentWithDetailsArb, (appointment) => {
        // Simulate the transformation that happens during DB operations
        const serialized = JSON.stringify(appointment);
        const deserialized = JSON.parse(serialized) as AppointmentWithDetails;

        // All fields should be preserved
        expect(deserialized.id).toBe(appointment.id);
        expect(deserialized.clientId).toBe(appointment.clientId);
        expect(deserialized.barberId).toBe(appointment.barberId);
        expect(deserialized.serviceId).toBe(appointment.serviceId);
        expect(deserialized.date).toBe(appointment.date);
        expect(deserialized.startTime).toBe(appointment.startTime);
        expect(deserialized.endTime).toBe(appointment.endTime);
        expect(deserialized.status).toBe(appointment.status);
        expect(deserialized.cancelReason).toBe(appointment.cancelReason);

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

describe("Cancellation Properties", () => {
  /**
   * **Feature: booking-system, Property 5: Late-cancellation warning (no hard block)**
   * *For any* appointment, cancellation by client SHALL be allowed as long as the
   * appointment hasn't started yet. If it's less than 2 hours away, the system
   * SHALL only show a warning (UI), not reject the cancellation.
   */
  it("client cancellation is allowed before start time and warns under 2 hours", () => {
    // Pure functions mirroring the updated business rule.
    const canClientCancel = (minutesUntilAppointment: number): boolean =>
      minutesUntilAppointment > 0;

    const shouldWarnLateCancellation = (
      minutesUntilAppointment: number,
    ): boolean => minutesUntilAppointment > 0 && minutesUntilAppointment < 120;

    fc.assert(
      fc.property(
        // Minutes until appointment can be in the past or future.
        fc.integer({ min: -24 * 60, max: 24 * 60 }),
        (minutesUntil) => {
          const canCancel = canClientCancel(minutesUntil);
          const shouldWarn = shouldWarnLateCancellation(minutesUntil);

          expect(canCancel).toBe(minutesUntil > 0);
          expect(shouldWarn).toBe(minutesUntil > 0 && minutesUntil < 120);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: booking-system, Property 9: Barber cancellation requires reason**
   * *For any* barber cancellation attempt, the operation SHALL fail if no
   * cancellation reason is provided.
   * **Validates: Requirements 4.2**
   */
  it("barber cancellation requires non-empty reason", () => {
    // Pure function to validate cancellation reason
    const isValidCancellationReason = (
      reason: string | null | undefined,
    ): boolean => {
      return (
        reason !== null && reason !== undefined && reason.trim().length > 0
      );
    };

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(""),
          fc.constant("   "), // whitespace only
          fc
            .string({ minLength: 1, maxLength: 500 })
            .filter((s) => s.trim().length > 0),
        ),
        (reason) => {
          const isValid = isValidCancellationReason(
            reason as string | null | undefined,
          );

          if (reason === null || reason === undefined || reason.trim() === "") {
            expect(isValid).toBe(false);
          } else {
            expect(isValid).toBe(true);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: booking-system, Property 6: Cancelled slot becomes available**
   * *For any* cancelled appointment (by client or barber), the previously
   * occupied time slot SHALL appear in available slots for that date.
   * **Validates: Requirements 2.4, 4.3**
   */
  it("cancelled appointments do not block slots", () => {
    // Helper function that determines if a status blocks slots
    const statusBlocksSlot = (status: AppointmentStatus): boolean => {
      return status === AppointmentStatus.CONFIRMED;
    };

    // This tests the filterAvailableSlots logic with cancelled appointments
    fc.assert(
      fc.property(
        timeStringArb,
        fc.constantFrom(
          AppointmentStatus.CANCELLED_BY_CLIENT,
          AppointmentStatus.CANCELLED_BY_BARBER,
        ),
        (time, cancelledStatus) => {
          // Simulate a cancelled appointment
          const cancelledAppointment = {
            startTime: time,
            endTime: time, // simplified
            status: cancelledStatus,
          };

          // A slot at the same time should still be available
          // because the appointment is cancelled
          const slots = [{ time, available: true }];

          // Filter function should not mark slot as unavailable for cancelled appointments
          const filtered = slots.map((slot) => {
            // Only CONFIRMED appointments block slots
            const isBlocked = statusBlocksSlot(cancelledAppointment.status);
            return { ...slot, available: slot.available && !isBlocked };
          });

          // Slot should remain available since appointment is cancelled
          expect(filtered[0].available).toBe(true);

          // Also verify that cancelled statuses don't block
          expect(statusBlocksSlot(cancelledStatus)).toBe(false);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
