import type { Appointment } from "@prisma/client";
import type { AppointmentData } from "@/types/booking";

/**
 * Serializes an Appointment from Prisma to JSON-safe format
 */
export function serializeAppointment(
  appointment: Appointment,
): AppointmentData {
  return {
    id: appointment.id,
    clientId: appointment.clientId,
    guestClientId: appointment.guestClientId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    date: appointment.date.toISOString(),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    cancelReason: appointment.cancelReason,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

/**
 * Deserializes JSON data back to Appointment-compatible format
 */
export function deserializeAppointment(data: AppointmentData): Omit<
  Appointment,
  "date" | "createdAt" | "updatedAt"
> & {
  date: Date;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: data.id,
    clientId: data.clientId,
    guestClientId: data.guestClientId,
    barberId: data.barberId,
    serviceId: data.serviceId,
    date: new Date(data.date),
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status,
    cancelReason: data.cancelReason,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

/**
 * Converts AppointmentData to JSON string
 */
export function appointmentToJson(data: AppointmentData): string {
  return JSON.stringify(data);
}

/**
 * Parses JSON string to AppointmentData
 */
export function jsonToAppointment(json: string): AppointmentData {
  return JSON.parse(json) as AppointmentData;
}
