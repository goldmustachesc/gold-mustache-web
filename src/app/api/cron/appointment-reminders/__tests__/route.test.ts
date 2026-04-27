import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/services/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock("@/services/appointment-reminders", () => ({
  APPOINTMENT_REMINDER_CRON_LOCK_KEY: 9142051,
  processAppointmentReminders: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/services/feature-flags";
import { processAppointmentReminders } from "@/services/appointment-reminders";
import { POST } from "../route";

function createRequest(token = "cron-secret"): Request {
  return new Request("http://localhost:3001/api/cron/appointment-reminders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

describe("POST /api/cron/appointment-reminders", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "cron-secret" };
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ locked: true }] as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never);
    vi.mocked(processAppointmentReminders).mockResolvedValue({
      eligibleCount: 2,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 1,
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("retorna 500 quando CRON_SECRET não está configurado", async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("CONFIG_ERROR");
  });

  it("retorna 401 quando authorization é inválido", async () => {
    const response = await POST(createRequest("invalid"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("retorna skipped quando feature flag appointmentReminders está desabilitada", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({
      skipped: true,
      reason: "appointmentReminders disabled",
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("retorna skipped quando lock advisory não é adquirido", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ locked: false }] as never);

    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({
      skipped: true,
      reason: "already_running",
    });
    expect(processAppointmentReminders).not.toHaveBeenCalled();
  });

  it("executa batch e libera lock quando cron roda com sucesso", async () => {
    const response = await POST(createRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({
      eligibleCount: 2,
      sentCount: 1,
      failedCount: 0,
      skippedCount: 1,
    });
    expect(processAppointmentReminders).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("retorna 500 quando batch lança erro e ainda libera lock", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(processAppointmentReminders).mockRejectedValue(new Error("boom"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });
});
