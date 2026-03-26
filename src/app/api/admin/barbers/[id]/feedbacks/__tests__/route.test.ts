import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockGetBarberFeedbacksAdmin = vi.fn();
const mockGetBarberFeedbackStats = vi.fn();
vi.mock("@/services/feedback", () => ({
  getBarberFeedbacksAdmin: (...args: unknown[]) =>
    mockGetBarberFeedbacksAdmin(...args),
  getBarberFeedbackStats: (...args: unknown[]) =>
    mockGetBarberFeedbackStats(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: { findUnique: vi.fn() },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

function adminAuthenticated() {
  mockRequireAdmin.mockResolvedValue({
    ok: true,
    userId: "admin-user-id",
    profileId: "admin-profile-id",
    role: "ADMIN",
  });
}

function adminUnauthorized() {
  mockRequireAdmin.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireAdminResult);
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(params = ""): NextRequest {
  return new NextRequest(
    `http://localhost:3001/api/admin/barbers/barber-1/feedbacks${params ? `?${params}` : ""}`,
  );
}

describe("GET /api/admin/barbers/[id]/feedbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET(createRequest(), routeParams("barber-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when barber not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);

    const response = await GET(createRequest(), routeParams("missing"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns feedbacks for barber", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue({
      id: "barber-1",
      name: "Carlos",
    } as never);
    mockGetBarberFeedbacksAdmin.mockResolvedValue({
      feedbacks: [],
      total: 0,
    });

    const response = await GET(createRequest(), routeParams("barber-1"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.barber.name).toBe("Carlos");
    expect(mockGetBarberFeedbacksAdmin).toHaveBeenCalledWith("barber-1", 1, 20);
  });

  it("includes stats when includeStats=true", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue({
      id: "barber-1",
      name: "Carlos",
    } as never);
    mockGetBarberFeedbacksAdmin.mockResolvedValue({
      feedbacks: [],
      total: 0,
    });
    mockGetBarberFeedbackStats.mockResolvedValue({ average: 4.5 });

    const response = await GET(
      createRequest("includeStats=true"),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.stats.average).toBe(4.5);
    expect(mockGetBarberFeedbackStats).toHaveBeenCalledWith("barber-1");
  });

  it("returns 500 on service failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barber.findUnique).mockResolvedValue({
      id: "barber-1",
      name: "Carlos",
    } as never);
    mockGetBarberFeedbacksAdmin.mockRejectedValue(new Error("fail"));

    const response = await GET(createRequest(), routeParams("barber-1"));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
