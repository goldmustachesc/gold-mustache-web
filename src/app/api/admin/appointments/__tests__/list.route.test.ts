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

const mockListAppointments = vi.fn();
vi.mock("@/services/admin/appointments", () => ({
  listAppointmentsForAdmin: (...args: unknown[]) =>
    mockListAppointments(...args),
}));

import { GET } from "../route";

function asAdmin() {
  mockRequireAdmin.mockResolvedValue({
    ok: true,
    userId: "uid-1",
    profileId: "profile-admin-1",
    role: "ADMIN",
  });
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

const mockRows = [
  {
    id: "apt-1",
    date: "2026-04-17",
    startTime: "10:00",
    endTime: "10:30",
    status: "CONFIRMED",
    source: "CLIENT",
    cancelReason: null,
    createdAt: "2026-04-01T10:00:00.000Z",
    barber: { id: "b-1", name: "João" },
    service: { id: "s-1", name: "Corte", price: 50, duration: 30 },
    client: { id: "p-1", fullName: "Fulano", phone: "47999999999" },
    guestClient: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockListAppointments.mockResolvedValue({ rows: mockRows, total: 1 });
});

describe("GET /api/admin/appointments", () => {
  it("returns 401 when unauthenticated", async () => {
    asUnauthorized(401);
    const res = await GET(
      new Request("http://localhost/api/admin/appointments"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin", async () => {
    asUnauthorized(403);
    const res = await GET(
      new Request("http://localhost/api/admin/appointments"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with data and meta for admin", async () => {
    asAdmin();
    const res = await GET(
      new Request("http://localhost/api/admin/appointments"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.meta).toMatchObject({ total: 1, page: 1, limit: 20 });
  });

  it("passes filters to service", async () => {
    asAdmin();
    await GET(
      new Request(
        "http://localhost/api/admin/appointments?barberId=123e4567-e89b-12d3-a456-426614174000&status=CONFIRMED&page=2&limit=10",
      ),
    );
    expect(mockListAppointments).toHaveBeenCalledWith(
      expect.objectContaining({
        barberId: "123e4567-e89b-12d3-a456-426614174000",
        status: "CONFIRMED",
        page: 2,
        limit: 10,
      }),
    );
  });

  it("returns 400 for invalid query params", async () => {
    asAdmin();
    const res = await GET(
      new Request(
        "http://localhost/api/admin/appointments?barberId=not-a-uuid",
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid status", async () => {
    asAdmin();
    const res = await GET(
      new Request("http://localhost/api/admin/appointments?status=PENDING"),
    );
    expect(res.status).toBe(400);
  });
});
