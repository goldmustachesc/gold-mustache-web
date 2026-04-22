import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/services/notification", () => ({
  notifyAppointmentReminder: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAuthUserEmailsByIds: vi.fn(),
}));

vi.mock("@/services/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock("@/services/transactional-email", () => ({
  buildAppointmentReminderEmailContent: vi.fn(() => ({
    subject: "Lembrete",
    html: "<p>Lembrete</p>",
    text: "Lembrete",
  })),
  sendTransactionalEmail: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  createNotification,
  notifyAppointmentReminder,
} from "@/services/notification";
import { getAuthUserEmailsByIds } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/services/feature-flags";
import { sendTransactionalEmail } from "@/services/transactional-email";
import {
  getReminderWindow,
  processAppointmentReminders,
} from "../appointment-reminders";

const REFERENCE_DATE = new Date("2026-04-22T12:00:00.000Z");

describe("services/appointment-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    vi.mocked(getAuthUserEmailsByIds).mockResolvedValue(new Map());
    vi.mocked(sendTransactionalEmail).mockResolvedValue({
      status: "sent",
      providerMessageId: "resend-1",
    });
    vi.mocked(prisma.appointment.updateMany).mockResolvedValue({
      count: 1,
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getReminderWindow calcula janela de 23h a 25h", () => {
    const window = getReminderWindow(REFERENCE_DATE);
    expect(window.start.toISOString()).toBe("2026-04-23T11:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-04-23T13:00:00.000Z");
  });

  it("retorna contadores zerados quando não há agendamentos elegíveis", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);

    const result = await processAppointmentReminders(REFERENCE_DATE);

    expect(result).toEqual({
      eligibleCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });
  });

  it("envia lembrete in-app e email para cliente registrado", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt-1",
        date: new Date("2026-04-23T00:00:00.000Z"),
        startTime: "09:30",
        reminderSentAt: null,
        service: { name: "Corte" },
        barber: { name: "Carlos", userId: "barber-user-1" },
        client: {
          userId: "client-user-1",
          fullName: "João Silva",
          phone: "47999990000",
        },
        guestClient: null,
      },
    ] as never);
    vi.mocked(getAuthUserEmailsByIds).mockResolvedValue(
      new Map([["client-user-1", "joao@gold.com"]]),
    );

    const result = await processAppointmentReminders(REFERENCE_DATE);

    expect(result).toEqual({
      eligibleCount: 1,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });
    expect(notifyAppointmentReminder).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    expect(prisma.appointment.updateMany).toHaveBeenCalledTimes(1);
  });

  it("gera notificação para WhatsApp do barbeiro quando flag está habilitada", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt-2",
        date: new Date("2026-04-23T00:00:00.000Z"),
        startTime: "09:30",
        reminderSentAt: null,
        service: { name: "Barba" },
        barber: { name: "Carlos", userId: "barber-user-1" },
        client: null,
        guestClient: {
          fullName: "Cliente Guest",
          phone: "47998887766",
        },
      },
    ] as never);

    const result = await processAppointmentReminders(REFERENCE_DATE);

    expect(result).toEqual({
      eligibleCount: 1,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("pula agendamentos fora da janela de 24h", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt-3",
        date: new Date("2026-04-23T00:00:00.000Z"),
        startTime: "20:00",
        reminderSentAt: null,
        service: { name: "Corte" },
        barber: { name: "Carlos", userId: "barber-user-1" },
        client: {
          userId: "client-user-1",
          fullName: "João Silva",
          phone: null,
        },
        guestClient: null,
      },
    ] as never);

    const result = await processAppointmentReminders(REFERENCE_DATE);

    expect(result).toEqual({
      eligibleCount: 1,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 1,
    });
    expect(notifyAppointmentReminder).not.toHaveBeenCalled();
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("marca como falha quando o processamento da notificação lança erro", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt-4",
        date: new Date("2026-04-23T00:00:00.000Z"),
        startTime: "09:30",
        reminderSentAt: null,
        service: { name: "Corte" },
        barber: { name: "Carlos", userId: "barber-user-1" },
        client: {
          userId: "client-user-1",
          fullName: "João Silva",
          phone: null,
        },
        guestClient: null,
      },
    ] as never);
    vi.mocked(notifyAppointmentReminder).mockRejectedValue(new Error("boom"));

    const result = await processAppointmentReminders(REFERENCE_DATE);

    expect(result).toEqual({
      eligibleCount: 1,
      sentCount: 0,
      failedCount: 1,
      skippedCount: 0,
    });
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });
});
