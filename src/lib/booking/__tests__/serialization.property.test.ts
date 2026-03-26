import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { AppointmentData } from "@/types/booking";
import {
  serializeAppointment,
  deserializeAppointment,
  appointmentToJson,
  jsonToAppointment,
} from "../serialization";

// Arbitrary generators for appointment data
const appointmentStatusArb = fc.constantFrom(
  "CONFIRMED",
  "CANCELLED_BY_CLIENT",
  "CANCELLED_BY_BARBER",
  "COMPLETED",
  "NO_SHOW",
) as fc.Arbitrary<AppointmentData["status"]>;

const timeStringArb = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(
    ([h, m]) =>
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
  );

// Generate valid ISO date strings
const isoDateStringArb = fc
  .integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2030, 11, 31) })
  .map((timestamp) => new Date(timestamp).toISOString());

const appointmentDataArb: fc.Arbitrary<AppointmentData> = fc.record({
  id: fc.uuid(),
  clientId: fc.option(fc.uuid(), { nil: null }),
  guestClientId: fc.option(fc.uuid(), { nil: null }),
  barberId: fc.uuid(),
  serviceId: fc.uuid(),
  date: isoDateStringArb,
  startTime: timeStringArb,
  endTime: timeStringArb,
  status: appointmentStatusArb,
  cancelReason: fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
    nil: null,
  }),
  createdAt: isoDateStringArb,
  updatedAt: isoDateStringArb,
});

describe("Appointment Serialization Properties", () => {
  /**
   * **Feature: booking-system, Property 14: Appointment serialization round-trip**
   * *For any* valid Appointment object, serializing to JSON and deserializing back
   * SHALL produce an object with identical field values.
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  it("appointment JSON round-trip preserves all field values", () => {
    fc.assert(
      fc.property(appointmentDataArb, (appointmentData) => {
        // Serialize to JSON string
        const jsonString = appointmentToJson(appointmentData);

        // Deserialize back to object
        const restored = jsonToAppointment(jsonString);

        // All fields should be identical
        expect(restored.id).toBe(appointmentData.id);
        expect(restored.clientId).toBe(appointmentData.clientId);
        expect(restored.guestClientId).toBe(appointmentData.guestClientId);
        expect(restored.barberId).toBe(appointmentData.barberId);
        expect(restored.serviceId).toBe(appointmentData.serviceId);
        expect(restored.date).toBe(appointmentData.date);
        expect(restored.startTime).toBe(appointmentData.startTime);
        expect(restored.endTime).toBe(appointmentData.endTime);
        expect(restored.status).toBe(appointmentData.status);
        expect(restored.cancelReason).toBe(appointmentData.cancelReason);
        expect(restored.createdAt).toBe(appointmentData.createdAt);
        expect(restored.updatedAt).toBe(appointmentData.updatedAt);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  // Generate valid dates from timestamps
  const validDateArb = fc
    .integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2030, 11, 31) })
    .map((timestamp) => new Date(timestamp));

  it("serialize then deserialize preserves date values", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        validDateArb,
        timeStringArb,
        timeStringArb,
        appointmentStatusArb,
        validDateArb,
        validDateArb,
        (
          id,
          clientId,
          barberId,
          serviceId,
          date,
          startTime,
          endTime,
          status,
          createdAt,
          updatedAt,
        ) => {
          // Create a mock Prisma Appointment
          const prismaAppointment = {
            id,
            clientId,
            guestClientId: null,
            barberId,
            serviceId,
            date,
            startTime,
            endTime,
            status,
            cancelReason: null,
            createdAt,
            updatedAt,
          };

          // Serialize
          const serialized = serializeAppointment(prismaAppointment);

          // Deserialize
          const deserialized = deserializeAppointment(serialized);

          // Date values should be equivalent
          expect(deserialized.date.getTime()).toBe(date.getTime());
          expect(deserialized.createdAt.getTime()).toBe(createdAt.getTime());
          expect(deserialized.updatedAt.getTime()).toBe(updatedAt.getTime());

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
