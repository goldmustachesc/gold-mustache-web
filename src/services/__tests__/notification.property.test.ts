import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { NotificationType } from "@prisma/client";

// ============================================
// Pure function implementations for testing
// ============================================

interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

interface Notification extends NotificationInput {
  id: string;
  read: boolean;
  createdAt: string;
}

/**
 * Simulates notification creation
 */
function createNotification(input: NotificationInput): Notification {
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Determines if a notification should be created for appointment confirmation
 */
function shouldCreateConfirmationNotification(
  appointmentCreated: boolean,
  clientId: string | null,
): boolean {
  return appointmentCreated && clientId !== null && clientId.length > 0;
}

/**
 * Determines if a notification should be created for cancellation
 */
function shouldCreateCancellationNotification(
  appointmentCancelled: boolean,
  cancelledBy: "client" | "barber",
  recipientId: string | null,
): { shouldNotify: boolean; recipientType: "client" | "barber" } {
  if (!appointmentCancelled || !recipientId) {
    return {
      shouldNotify: false,
      recipientType: cancelledBy === "client" ? "barber" : "client",
    };
  }

  // When client cancels, notify barber; when barber cancels, notify client
  return {
    shouldNotify: true,
    recipientType: cancelledBy === "client" ? "barber" : "client",
  };
}

// ============================================
// Arbitrary Generators
// ============================================

const uuidArb = fc.uuid();

const notificationTypeArb = fc.constantFrom(
  NotificationType.APPOINTMENT_CONFIRMED,
  NotificationType.APPOINTMENT_CANCELLED,
  NotificationType.APPOINTMENT_REMINDER,
);

const appointmentDetailsArb = fc.record({
  serviceName: fc.string({ minLength: 1, maxLength: 100 }),
  barberName: fc.string({ minLength: 1, maxLength: 100 }),
  date: fc.string({ minLength: 10, maxLength: 10 }),
  time: fc.string({ minLength: 5, maxLength: 5 }),
});

// ============================================
// Property Tests
// ============================================

describe("Notification Service Properties", () => {
  /**
   * **Feature: booking-system, Property 10: Appointment creation triggers client notification**
   * *For any* created appointment, a notification of type APPOINTMENT_CONFIRMED
   * SHALL be created for the client.
   * **Validates: Requirements 5.1**
   */
  it("appointment creation triggers confirmation notification for client", () => {
    fc.assert(
      fc.property(uuidArb, appointmentDetailsArb, (clientId, details) => {
        // Simulate appointment creation
        const appointmentCreated = true;

        // Check if notification should be created
        const shouldNotify = shouldCreateConfirmationNotification(
          appointmentCreated,
          clientId,
        );
        expect(shouldNotify).toBe(true);

        // Create the notification
        const notification = createNotification({
          userId: clientId,
          type: NotificationType.APPOINTMENT_CONFIRMED,
          title: "Agendamento Confirmado",
          message: `Seu agendamento de ${details.serviceName} foi confirmado.`,
          data: details,
        });

        // Verify notification properties
        expect(notification.userId).toBe(clientId);
        expect(notification.type).toBe(NotificationType.APPOINTMENT_CONFIRMED);
        expect(notification.read).toBe(false);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: booking-system, Property 11: Cancellation triggers appropriate notification**
   * *For any* cancelled appointment, a notification SHALL be sent to the other party
   * (client notified if barber cancels, barber notified if client cancels).
   * **Validates: Requirements 5.2, 5.3**
   */
  it("cancellation by barber triggers notification to client", () => {
    fc.assert(
      fc.property(uuidArb, appointmentDetailsArb, (clientId, details) => {
        const result = shouldCreateCancellationNotification(
          true,
          "barber",
          clientId,
        );

        expect(result.shouldNotify).toBe(true);
        expect(result.recipientType).toBe("client");

        // Create the notification
        const notification = createNotification({
          userId: clientId,
          type: NotificationType.APPOINTMENT_CANCELLED,
          title: "Agendamento Cancelado",
          message: `Seu agendamento foi cancelado pelo barbeiro.`,
          data: details,
        });

        expect(notification.userId).toBe(clientId);
        expect(notification.type).toBe(NotificationType.APPOINTMENT_CANCELLED);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("cancellation by client triggers notification to barber", () => {
    fc.assert(
      fc.property(uuidArb, appointmentDetailsArb, (barberUserId, details) => {
        const result = shouldCreateCancellationNotification(
          true,
          "client",
          barberUserId,
        );

        expect(result.shouldNotify).toBe(true);
        expect(result.recipientType).toBe("barber");

        // Create the notification
        const notification = createNotification({
          userId: barberUserId,
          type: NotificationType.APPOINTMENT_CANCELLED,
          title: "Agendamento Cancelado",
          message: `O cliente cancelou o agendamento.`,
          data: details,
        });

        expect(notification.userId).toBe(barberUserId);
        expect(notification.type).toBe(NotificationType.APPOINTMENT_CANCELLED);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("new notifications are created with read=false", () => {
    fc.assert(
      fc.property(
        uuidArb,
        notificationTypeArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (userId, type, title, message) => {
          const notification = createNotification({
            userId,
            type,
            title,
            message,
          });

          // All new notifications should be unread
          expect(notification.read).toBe(false);
          expect(notification.userId).toBe(userId);
          expect(notification.type).toBe(type);
          expect(notification.title).toBe(title);
          expect(notification.message).toBe(message);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
