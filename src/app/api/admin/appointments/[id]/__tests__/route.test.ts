import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

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

const mockReschedule = vi.fn();
vi.mock("@/services/admin/appointments", () => ({
  rescheduleAppointmentAsAdmin: (...args: unknown[]) => mockReschedule(...args),
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

function makeRequest(
  body: unknown = { date: "2026-04-25", startTime: "10:30" },
) {
  return new Request("http://localhost/api/admin/appointments/apt-1", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3001",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReschedule.mockResolvedValue({
    id: "apt-1",
    date: "2026-04-25",
    startTime: "10:30",
    endTime: "11:00",
    status: "CONFIRMED",
    source: "ADMIN",
    cancelReason: null,
    createdAt: "2026-04-01T10:00:00.000Z",
    barber: { id: "barber-1", name: "João" },
    service: { id: "s-1", name: "Corte", price: 50, duration: 30 },
    client: { id: "p-1", fullName: "Fulano", phone: "47999999999" },
    guestClient: null,
  });
});

describe("PATCH /api/admin/appointments/[id]", () => {
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

  it("returns 422 for invalid payload", async () => {
    asAdmin();
    const res = await PATCH(makeRequest({ date: "2026-04-25" }), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 404 when appointment is not found", async () => {
    asAdmin();
    mockReschedule.mockRejectedValue(new Error("APPOINTMENT_NOT_FOUND"));

    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 400 when appointment is not reschedulable", async () => {
    asAdmin();
    mockReschedule.mockRejectedValue(
      new Error("APPOINTMENT_NOT_RESCHEDULABLE"),
    );

    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 409 for client overlap", async () => {
    asAdmin();
    mockReschedule.mockRejectedValue(
      new Error("CLIENT_OVERLAPPING_APPOINTMENT"),
    );

    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });

    expect(res.status).toBe(409);
  });

  it("returns 200 with updated appointment on success", async () => {
    asAdmin();
    const res = await PATCH(makeRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.startTime).toBe("10:30");
    expect(mockReschedule).toHaveBeenCalledWith(
      "apt-1",
      { date: "2026-04-25", startTime: "10:30" },
      "profile-admin-1",
    );
  });
});
