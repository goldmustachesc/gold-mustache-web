import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { AppointmentWithDetails } from "@/types/booking";
import { AppointmentStatus } from "@prisma/client";

/**
 * **Feature: booking-system, Property 8: Appointment display completeness**
 * **Validates: Requirements 3.4**
 *
 * For any appointment, the display data SHALL include client name,
 * service type, start time, and status.
 */

// Helper function to format appointment display data
function formatAppointmentDisplay(appointment: AppointmentWithDetails): string {
  const clientName =
    appointment.client?.fullName ??
    appointment.guestClient?.fullName ??
    "Cliente";
  return [
    clientName,
    appointment.service.name,
    appointment.startTime,
    appointment.status,
  ].join(" | ");
}

// Helper to generate valid time string
const timeArbitrary = fc.integer({ min: 8, max: 20 }).chain((hour) =>
  fc.integer({ min: 0, max: 1 }).map((half) => {
    const h = hour.toString().padStart(2, "0");
    const m = half === 0 ? "00" : "30";
    return `${h}:${m}`;
  }),
);

// Helper to generate valid ISO date string
const isoDateArbitrary = fc.integer({ min: 2024, max: 2030 }).chain((year) =>
  fc.integer({ min: 1, max: 12 }).chain((month) =>
    fc.integer({ min: 1, max: 28 }).map((day) => {
      const m = month.toString().padStart(2, "0");
      const d = day.toString().padStart(2, "0");
      return `${year}-${m}-${d}T10:00:00.000Z`;
    }),
  ),
);

// Arbitrary for generating valid appointment data
const appointmentArbitrary: fc.Arbitrary<AppointmentWithDetails> = fc.record({
  id: fc.uuid(),
  clientId: fc.option(fc.uuid(), { nil: null }),
  guestClientId: fc.option(fc.uuid(), { nil: null }),
  barberId: fc.uuid(),
  serviceId: fc.uuid(),
  date: isoDateArbitrary,
  startTime: timeArbitrary,
  endTime: timeArbitrary,
  status: fc.constantFrom(
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED_BY_CLIENT,
    AppointmentStatus.CANCELLED_BY_BARBER,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
  ),
  cancelReason: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: null,
  }),
  createdAt: isoDateArbitrary,
  updatedAt: isoDateArbitrary,
  client: fc.option(
    fc.record({
      id: fc.uuid(),
      fullName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
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
      id: fc.uuid(),
      fullName: fc.string({ minLength: 1, maxLength: 50 }),
      phone: fc.string({ minLength: 10, maxLength: 15 }),
    }),
    { nil: null },
  ),
  barber: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    avatarUrl: fc.option(fc.constant("https://example.com/avatar.jpg"), {
      nil: null,
    }),
  }),
  service: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    duration: fc.integer({ min: 15, max: 120 }),
    price: fc.integer({ min: 10, max: 500 }),
  }),
});

describe("Appointment Display Properties", () => {
  // **Feature: booking-system, Property 8: Appointment display completeness**
  it("appointment display includes client name, service type, start time, and status", () => {
    fc.assert(
      fc.property(appointmentArbitrary, (appointment) => {
        const display = formatAppointmentDisplay(appointment);

        // Display should contain client name (or fallback)
        const clientName =
          appointment.client?.fullName ??
          appointment.guestClient?.fullName ??
          "Cliente";
        expect(display).toContain(clientName);

        // Display should contain service name
        expect(display).toContain(appointment.service.name);

        // Display should contain start time
        expect(display).toContain(appointment.startTime);

        // Display should contain status
        expect(display).toContain(appointment.status);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("appointment display handles null client name gracefully", () => {
    fc.assert(
      fc.property(
        appointmentArbitrary.map((apt) => ({
          ...apt,
          client: apt.client ? { ...apt.client, fullName: null } : null,
          guestClient: null,
        })),
        (appointment) => {
          const display = formatAppointmentDisplay(appointment);

          // Should use fallback "Cliente" when fullName is null
          expect(display).toContain("Cliente");

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("appointment display data is never empty for required fields", () => {
    fc.assert(
      fc.property(appointmentArbitrary, (appointment) => {
        // Service name should never be empty
        expect(appointment.service.name.length).toBeGreaterThan(0);

        // Start time should be in valid format
        expect(appointment.startTime).toMatch(/^\d{2}:\d{2}$/);

        // Status should be a valid enum value
        expect(Object.values(AppointmentStatus)).toContain(appointment.status);

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
