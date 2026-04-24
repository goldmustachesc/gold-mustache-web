import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: vi.fn(() => null),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ success: true })),
}));

const mockCancelAppointment = vi.fn();
vi.mock("@/services/admin/appointments", () => ({
  cancelAppointmentAsAdmin: (...args: unknown[]) =>
    mockCancelAppointment(...args),
}));

import { PATCH } from "../route";

const ADMIN_RESULT: RequireAdminResult = {
  ok: true,
  userId: "uid-1",
  profileId: "profile-admin-1",
  role: "ADMIN",
};

function asAdmin() {
  mockRequireAdmin.mockResolvedValue(ADMIN_RESULT);
}

function asUnauthorized(status = 401) {
  mockRequireAdmin.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireAdminResult);
}

function makeRequest(body: unknown = { reason: "Motivo válido" }) {
  return new Request("http://localhost/api/admin/appointments/apt-1/cancel", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3001",
    },
    body: JSON.stringify(body),
  });
}

const mockCancelledItem = {
  id: "apt-1",
  date: "2026-04-17",
  startTime: "10:00",
  endTime: "10:30",
  status: "CANCELLED_BY_BARBER",
  source: "ADMIN",
  cancelReason: "[ADMIN] Motivo válido",
  createdAt: "2026-04-01T10:00:00.000Z",
  barber: { id: "b-1", name: "João" },
  service: { id: "s-1", name: "Corte", price: 50, duration: 30 },
  client: { id: "p-1", fullName: "Fulano", phone: "47999999999" },
  guestClient: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCancelAppointment.mockResolvedValue(mockCancelledItem);
});

describe("PATCH /api/admin/appointments/[id]/cancel", () => {
  it("returns 401 when unauthenticated", async () => {
    asUnauthorized(401);
    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin", async () => {
    asUnauthorized(403);
    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 422 when reason is missing", async () => {
    asAdmin();
    const res = await PATCH(makeRequest({}), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when reason is too short", async () => {
    asAdmin();
    const res = await PATCH(makeRequest({ reason: "ab" }), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 404 when appointment not found", async () => {
    asAdmin();
    mockCancelAppointment.mockRejectedValue(new Error("APPOINTMENT_NOT_FOUND"));
    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "not-found" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when appointment not cancellable", async () => {
    asAdmin();
    mockCancelAppointment.mockRejectedValue(
      new Error("APPOINTMENT_NOT_CANCELLABLE"),
    );
    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 with cancelled appointment on success", async () => {
    asAdmin();
    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("CANCELLED_BY_BARBER");
    expect(mockCancelAppointment).toHaveBeenCalledWith(
      "apt-1",
      "Motivo válido",
      "profile-admin-1",
    );
  });
});
