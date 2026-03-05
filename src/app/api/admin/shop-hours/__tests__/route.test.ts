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
    shopHours: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { GET, PUT } from "../route";
import { prisma } from "@/lib/prisma";

const SHOP_HOURS_FIXTURE = [
  {
    id: "sh-1",
    dayOfWeek: 1,
    isOpen: true,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    id: "sh-2",
    dayOfWeek: 0,
    isOpen: false,
    startTime: null,
    endTime: null,
    breakStart: null,
    breakEnd: null,
  },
];

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

function createPutRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/admin/shop-hours", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_PUT_BODY = {
  days: [
    {
      dayOfWeek: 1,
      isOpen: true,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    },
    { dayOfWeek: 0, isOpen: false },
  ],
};

describe("GET /api/admin/shop-hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns shop hours ordered by dayOfWeek", async () => {
    adminAuthenticated();
    vi.mocked(prisma.shopHours.findMany).mockResolvedValue(
      SHOP_HOURS_FIXTURE as never,
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].dayOfWeek).toBe(1);
    expect(json.data[0].isOpen).toBe(true);
    expect(json.data[1].isOpen).toBe(false);
  });
});

describe("PUT /api/admin/shop-hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await PUT(createPutRequest(VALID_PUT_BODY));

    expect(response.status).toBe(401);
  });

  it("returns 422 for invalid body", async () => {
    adminAuthenticated();

    const response = await PUT(createPutRequest({ days: "invalid" }));
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("upserts shop hours via transaction", async () => {
    adminAuthenticated();
    vi.mocked(prisma.$transaction).mockResolvedValue(
      SHOP_HOURS_FIXTURE as never,
    );

    const response = await PUT(createPutRequest(VALID_PUT_BODY));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("clears times when isOpen is false", async () => {
    adminAuthenticated();
    vi.mocked(prisma.$transaction).mockResolvedValue(
      SHOP_HOURS_FIXTURE as never,
    );

    await PUT(createPutRequest(VALID_PUT_BODY));

    expect(prisma.shopHours.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dayOfWeek: 0 },
        create: expect.objectContaining({
          isOpen: false,
          startTime: null,
          endTime: null,
        }),
        update: expect.objectContaining({
          isOpen: false,
          startTime: null,
          endTime: null,
        }),
      }),
    );
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB down"));

    const response = await PUT(createPutRequest(VALID_PUT_BODY));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
