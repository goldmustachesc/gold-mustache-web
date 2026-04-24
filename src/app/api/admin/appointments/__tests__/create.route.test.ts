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

const mockRequireValidOrigin = vi.fn<() => Response | null>();
vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => mockRequireValidOrigin(),
}));

const mockCheckRateLimit = vi.fn<() => Promise<{ success: boolean }>>();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => mockCheckRateLimit(),
}));

const mockCreateAppointmentAsAdmin = vi.fn();
vi.mock("@/services/admin/appointments", () => ({
  createAppointmentAsAdmin: (...args: unknown[]) =>
    mockCreateAppointmentAsAdmin(...args),
}));

import { POST } from "../route";

const ADMIN_RESULT = {
  ok: true as const,
  userId: "uid-1",
  profileId: "profile-admin-1",
  role: "ADMIN" as const,
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

const VALID_CLIENT_BODY = {
  barberId: "123e4567-e89b-12d3-a456-426614174000",
  serviceId: "223e4567-e89b-12d3-a456-426614174001",
  date: "2026-04-20",
  startTime: "10:00",
  clientProfileId: "323e4567-e89b-12d3-a456-426614174002",
};

const VALID_GUEST_BODY = {
  barberId: "123e4567-e89b-12d3-a456-426614174000",
  serviceId: "223e4567-e89b-12d3-a456-426614174001",
  date: "2026-04-20",
  startTime: "10:00",
  guest: { name: "Convidado", phone: "47988888888" },
};

const MOCK_CREATED = {
  id: "apt-new",
  date: "2026-04-20",
  startTime: "10:00",
  endTime: "10:30",
  status: "CONFIRMED",
  source: "ADMIN",
  cancelReason: null,
  createdAt: "2026-04-17T00:00:00.000Z",
  barber: { id: "123e4567-e89b-12d3-a456-426614174000", name: "João" },
  service: {
    id: "223e4567-e89b-12d3-a456-426614174001",
    name: "Corte",
    price: 50,
    duration: 30,
  },
  client: {
    id: "323e4567-e89b-12d3-a456-426614174002",
    fullName: "Fulano",
    phone: "47999999999",
  },
  guestClient: null,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireValidOrigin.mockReturnValue(null);
  mockCheckRateLimit.mockResolvedValue({ success: true });
  mockCreateAppointmentAsAdmin.mockResolvedValue(MOCK_CREATED);
});

describe("POST /api/admin/appointments", () => {
  it("returns 401 when unauthenticated", async () => {
    asUnauthorized(401);
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin", async () => {
    asUnauthorized(403);
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 403 when origin invalid", async () => {
    asAdmin();
    mockRequireValidOrigin.mockReturnValue(
      new Response(JSON.stringify({ error: "FORBIDDEN" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    asAdmin();
    mockCheckRateLimit.mockResolvedValue({ success: false });
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("returns 422 when body is not valid JSON", async () => {
    asAdmin();
    const req = new Request("http://localhost/api/admin/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
      },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when required fields missing", async () => {
    asAdmin();
    const res = await POST(makeRequest({ barberId: "bad" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 201 for client path", async () => {
    asAdmin();
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("apt-new");
    expect(body.data.source).toBe("ADMIN");
  });

  it("returns 201 for guest path", async () => {
    asAdmin();
    mockCreateAppointmentAsAdmin.mockResolvedValue({
      ...MOCK_CREATED,
      client: null,
      guestClient: { id: "g-1", fullName: "Convidado", phone: "47988888888" },
    });
    const res = await POST(makeRequest(VALID_GUEST_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.guestClient?.fullName).toBe("Convidado");
  });

  it("calls createAppointmentAsAdmin with profileId", async () => {
    asAdmin();
    await POST(makeRequest(VALID_CLIENT_BODY));
    expect(mockCreateAppointmentAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        clientProfileId: VALID_CLIENT_BODY.clientProfileId,
      }),
      "profile-admin-1",
    );
  });

  it("returns 409 for SLOT_OCCUPIED", async () => {
    asAdmin();
    mockCreateAppointmentAsAdmin.mockRejectedValue(new Error("SLOT_OCCUPIED"));
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("SLOT_OCCUPIED");
  });

  it("returns 400 for SLOT_IN_PAST", async () => {
    asAdmin();
    mockCreateAppointmentAsAdmin.mockRejectedValue(new Error("SLOT_IN_PAST"));
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(400);
  });

  it("returns 400 for CLIENT_BANNED", async () => {
    asAdmin();
    mockCreateAppointmentAsAdmin.mockRejectedValue(new Error("CLIENT_BANNED"));
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(400);
  });

  it("returns 404 for PROFILE_NOT_FOUND", async () => {
    asAdmin();
    mockCreateAppointmentAsAdmin.mockRejectedValue(
      new Error("PROFILE_NOT_FOUND"),
    );
    const res = await POST(makeRequest(VALID_CLIENT_BODY));
    expect(res.status).toBe(404);
  });
});
