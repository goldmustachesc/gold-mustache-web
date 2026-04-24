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

const mockGetCalendar = vi.fn();
vi.mock("@/services/admin/appointments", () => ({
  getCalendarForAdmin: (...args: unknown[]) => mockGetCalendar(...args),
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

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCalendar.mockResolvedValue([]);
});

describe("GET /api/admin/appointments/calendar", () => {
  it("returns 401 when unauthenticated", async () => {
    asUnauthorized(401);
    const res = await GET(
      new Request(
        "http://localhost/api/admin/appointments/calendar?date=2026-04-17",
      ),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin", async () => {
    asUnauthorized(403);
    const res = await GET(
      new Request(
        "http://localhost/api/admin/appointments/calendar?date=2026-04-17",
      ),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when date is missing", async () => {
    asAdmin();
    const res = await GET(
      new Request("http://localhost/api/admin/appointments/calendar"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when date is invalid", async () => {
    asAdmin();
    const res = await GET(
      new Request(
        "http://localhost/api/admin/appointments/calendar?date=invalid",
      ),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with calendar data", async () => {
    asAdmin();
    const res = await GET(
      new Request(
        "http://localhost/api/admin/appointments/calendar?date=2026-04-17&view=day",
      ),
    );
    expect(res.status).toBe(200);
    expect(mockGetCalendar).toHaveBeenCalledWith({
      view: "day",
      date: "2026-04-17",
      barberIds: undefined,
    });
  });

  it("passes barberIds as array", async () => {
    asAdmin();
    await GET(
      new Request(
        "http://localhost/api/admin/appointments/calendar?date=2026-04-17&barberIds=id-1,id-2",
      ),
    );
    expect(mockGetCalendar).toHaveBeenCalledWith(
      expect.objectContaining({ barberIds: ["id-1", "id-2"] }),
    );
  });
});
