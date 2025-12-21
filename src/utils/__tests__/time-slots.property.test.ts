import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  generateTimeSlots,
  filterAvailableSlots,
  parseTimeToMinutes,
  type ExistingAppointment,
} from "../time-slots";

// Arbitrary generators
const hourArb = fc.integer({ min: 0, max: 23 });
const minuteArb = fc.constantFrom(0, 30); // Only 0 or 30 for valid slots

const _timeStringArb = fc
  .tuple(hourArb, minuteArb)
  .map(
    ([h, m]) =>
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
  );

// Generate valid working hours (start before end)
const workingHoursArb = fc
  .tuple(
    fc.integer({ min: 6, max: 12 }), // start hour (6-12)
    fc.integer({ min: 14, max: 22 }), // end hour (14-22)
  )
  .map(([startHour, endHour]) => ({
    startTime: `${startHour.toString().padStart(2, "0")}:00`,
    endTime: `${endHour.toString().padStart(2, "0")}:00`,
  }));

// Generate optional break period within working hours
const _breakPeriodArb = (startHour: number, endHour: number) =>
  fc.option(
    fc
      .tuple(
        fc.integer({
          min: startHour + 1,
          max: Math.min(startHour + 4, endHour - 2),
        }),
        fc.integer({ min: 1, max: 2 }),
      )
      .map(([breakStart, breakDuration]) => ({
        breakStart: `${breakStart.toString().padStart(2, "0")}:00`,
        breakEnd: `${(breakStart + breakDuration).toString().padStart(2, "0")}:00`,
      })),
    { nil: undefined },
  );

describe("Time Slot Properties", () => {
  /**
   * **Feature: booking-system, Property 12: Slots respect working hours**
   * *For any* time slot query, returned available slots SHALL only include
   * times within the barber's configured working hours and outside break periods.
   * **Validates: Requirements 6.2**
   */
  it("all generated slots are within working hours", () => {
    fc.assert(
      fc.property(workingHoursArb, ({ startTime, endTime }) => {
        const slots = generateTimeSlots({
          startTime,
          endTime,
          duration: 30,
        });

        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = parseTimeToMinutes(endTime);

        // All slots should be within working hours
        for (const slot of slots) {
          const slotMinutes = parseTimeToMinutes(slot.time);
          expect(slotMinutes).toBeGreaterThanOrEqual(startMinutes);
          expect(slotMinutes + 30).toBeLessThanOrEqual(endMinutes);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("no slots fall within break period", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 10 }),
        fc.integer({ min: 16, max: 20 }),
        (startHour, endHour) => {
          const startTime = `${startHour.toString().padStart(2, "0")}:00`;
          const endTime = `${endHour.toString().padStart(2, "0")}:00`;
          const breakStart = "12:00";
          const breakEnd = "13:00";

          const slots = generateTimeSlots({
            startTime,
            endTime,
            duration: 30,
            breakStart,
            breakEnd,
          });

          const breakStartMinutes = parseTimeToMinutes(breakStart);
          const breakEndMinutes = parseTimeToMinutes(breakEnd);

          // No slot should start during break
          for (const slot of slots) {
            const slotMinutes = parseTimeToMinutes(slot.time);
            const isInBreak =
              slotMinutes >= breakStartMinutes && slotMinutes < breakEndMinutes;
            expect(isInBreak).toBe(false);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("slots are generated in chronological order", () => {
    fc.assert(
      fc.property(workingHoursArb, ({ startTime, endTime }) => {
        const slots = generateTimeSlots({
          startTime,
          endTime,
          duration: 30,
        });

        // Slots should be in ascending order
        for (let i = 1; i < slots.length; i++) {
          const prevMinutes = parseTimeToMinutes(slots[i - 1].time);
          const currMinutes = parseTimeToMinutes(slots[i].time);
          expect(currMinutes).toBeGreaterThan(prevMinutes);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

describe("Slot Availability Filter Properties", () => {
  /**
   * **Feature: booking-system, Property 1: Available slots exclude occupied times**
   * *For any* date and set of existing appointments, the available time slots
   * returned SHALL NOT include any time that overlaps with an existing confirmed appointment.
   * **Validates: Requirements 1.2, 1.4**
   */
  it("filtered slots exclude times with confirmed appointments", () => {
    fc.assert(
      fc.property(
        workingHoursArb,
        fc.array(
          fc
            .tuple(fc.integer({ min: 9, max: 16 }), fc.constantFrom(0, 30))
            .map(([h, m]) => ({
              startTime: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
              endTime: `${h.toString().padStart(2, "0")}:${(m + 30).toString().padStart(2, "0")}`,
              status: "CONFIRMED",
            })),
          { minLength: 0, maxLength: 5 },
        ),
        ({ startTime, endTime }, appointments) => {
          const slots = generateTimeSlots({
            startTime,
            endTime,
            duration: 30,
          });

          const filteredSlots = filterAvailableSlots(slots, appointments);
          const availableSlots = filteredSlots.filter((s) => s.available);

          // No available slot should overlap with a confirmed appointment
          for (const slot of availableSlots) {
            const slotMinutes = parseTimeToMinutes(slot.time);

            for (const apt of appointments) {
              const aptStartMinutes = parseTimeToMinutes(apt.startTime);
              const aptEndMinutes = parseTimeToMinutes(apt.endTime);

              // Slot should not start during an appointment
              const overlaps =
                slotMinutes >= aptStartMinutes && slotMinutes < aptEndMinutes;
              expect(overlaps).toBe(false);
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("cancelled appointments do not block slots", () => {
    fc.assert(
      fc.property(
        workingHoursArb,
        fc.integer({ min: 9, max: 15 }),
        ({ startTime, endTime }, appointmentHour) => {
          const slots = generateTimeSlots({
            startTime,
            endTime,
            duration: 30,
          });

          const cancelledAppointment: ExistingAppointment = {
            startTime: `${appointmentHour.toString().padStart(2, "0")}:00`,
            endTime: `${appointmentHour.toString().padStart(2, "0")}:30`,
            status: "CANCELLED_BY_CLIENT",
          };

          const filteredSlots = filterAvailableSlots(slots, [
            cancelledAppointment,
          ]);

          // The slot at the cancelled appointment time should still be available
          const slotAtTime = filteredSlots.find(
            (s) => s.time === cancelledAppointment.startTime,
          );

          if (slotAtTime) {
            expect(slotAtTime.available).toBe(true);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
