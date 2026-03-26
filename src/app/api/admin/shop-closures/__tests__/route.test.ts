import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopClosure: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const CLOSURE_FIXTURE = {
  id: "closure-1",
  date: new Date("2026-03-15T00:00:00.000Z"),
  startTime: null,
  endTime: null,
  reason: "Feriado",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const PARTIAL_CLOSURE_FIXTURE = {
  id: "closure-2",
  date: new Date("2026-03-20T00:00:00.000Z"),
  startTime: "14:00",
  endTime: "18:00",
  reason: "Manutenção",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

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

function createGetRequest(params = ""): Request {
  return new Request(
    `http://localhost:3001/api/admin/shop-closures${params ? `?${params}` : ""}`,
  );
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/admin/shop-closures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/shop-closures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(401);
  });

  it("returns all closures without date filter", async () => {
    adminAuthenticated();
    vi.mocked(prisma.shopClosure.findMany).mockResolvedValue([
      CLOSURE_FIXTURE,
      PARTIAL_CLOSURE_FIXTURE,
    ] as never);

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].reason).toBe("Feriado");
    expect(json.data[0].startTime).toBeNull();
    expect(json.data[1].startTime).toBe("14:00");
  });

  it("passes date range filter to Prisma", async () => {
    adminAuthenticated();
    vi.mocked(prisma.shopClosure.findMany).mockResolvedValue([] as never);

    await GET(createGetRequest("startDate=2026-03-01&endDate=2026-03-31"));

    const call = vi.mocked(prisma.shopClosure.findMany).mock.calls[0][0] as {
      where: { date: { gte?: Date; lt?: Date } };
    };
    expect(call.where.date.gte).toBeDefined();
    expect(call.where.date.lt).toBeDefined();
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.shopClosure.findMany).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("POST /api/admin/shop-closures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await POST(createPostRequest({ date: "2026-03-15" }));

    expect(response.status).toBe(401);
  });

  it("returns 422 for invalid body", async () => {
    adminAuthenticated();

    const response = await POST(createPostRequest({}));
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("creates full-day closure", async () => {
    adminAuthenticated();
    vi.mocked(prisma.shopClosure.create).mockResolvedValue(
      CLOSURE_FIXTURE as never,
    );

    const response = await POST(
      createPostRequest({ date: "2026-03-15", reason: "Feriado" }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.reason).toBe("Feriado");
    expect(json.data.startTime).toBeNull();
    expect(json.data.endTime).toBeNull();
  });

  it("creates partial-day closure with time range", async () => {
    adminAuthenticated();
    vi.mocked(prisma.shopClosure.create).mockResolvedValue(
      PARTIAL_CLOSURE_FIXTURE as never,
    );

    const response = await POST(
      createPostRequest({
        date: "2026-03-20",
        startTime: "14:00",
        endTime: "18:00",
        reason: "Manutenção",
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.startTime).toBe("14:00");
    expect(json.data.endTime).toBe("18:00");
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.shopClosure.create).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await POST(createPostRequest({ date: "2026-03-15" }));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
