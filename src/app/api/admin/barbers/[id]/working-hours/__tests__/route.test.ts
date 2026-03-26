import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

const mockBuildWorkingHoursResponse = vi.fn();
const mockUpsertWorkingHoursInTransaction = vi.fn();
vi.mock("@/lib/working-hours", () => ({
  buildWorkingHoursResponse: (...args: unknown[]) =>
    mockBuildWorkingHoursResponse(...args),
  upsertWorkingHoursInTransaction: (...args: unknown[]) =>
    mockUpsertWorkingHoursInTransaction(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: {
      findUnique: vi.fn(),
    },
    workingHours: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { GET, PUT } from "../route";
import { prisma } from "@/lib/prisma";

const BARBER_FIXTURE = { id: "barber-1", name: "Carlos" };

const WORKING_HOURS_RESPONSE = [
  { dayOfWeek: 1, isWorking: true, startTime: "09:00", endTime: "18:00" },
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

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(): Request {
  return new Request(
    "http://localhost:3001/api/admin/barbers/barber-1/working-hours",
  );
}

function createPutRequest(body: unknown): Request {
  return new Request(
    "http://localhost:3001/api/admin/barbers/barber-1/working-hours",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function createInvalidJsonRequest(): Request {
  return new Request(
    "http://localhost:3001/api/admin/barbers/barber-1/working-hours",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    },
  );
}

const VALID_PUT_BODY = {
  days: [
    {
      dayOfWeek: 1,
      isWorking: true,
      startTime: "09:00",
      endTime: "18:00",
    },
  ],
};

describe("GET /api/admin/barbers/[id]/working-hours", () => {
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

  it("returns barber working hours", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([] as never);
    mockBuildWorkingHoursResponse.mockReturnValue(WORKING_HOURS_RESPONSE);

    const response = await GET(createRequest(), routeParams("barber-1"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.barber.name).toBe("Carlos");
    expect(json.data.days).toEqual(WORKING_HOURS_RESPONSE);
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barber.findUnique).mockRejectedValue(new Error("DB down"));

    const response = await GET(createRequest(), routeParams("barber-1"));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("PUT /api/admin/barbers/[id]/working-hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertWorkingHoursInTransaction.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await PUT(
      createPutRequest(VALID_PUT_BODY),
      routeParams("barber-1"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when barber not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);

    const response = await PUT(
      createPutRequest(VALID_PUT_BODY),
      routeParams("missing"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid JSON", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );

    const response = await PUT(
      createInvalidJsonRequest(),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("INVALID_JSON");
  });

  it("returns 422 for invalid body", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );

    const response = await PUT(
      createPutRequest({ days: [] }),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("updates working hours via transaction", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === "function") return fn(prisma);
    });
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([] as never);
    mockBuildWorkingHoursResponse.mockReturnValue(WORKING_HOURS_RESPONSE);

    const response = await PUT(
      createPutRequest(VALID_PUT_BODY),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.barber.name).toBe("Carlos");
    expect(json.data.days).toEqual(WORKING_HOURS_RESPONSE);
    expect(mockUpsertWorkingHoursInTransaction).toHaveBeenCalled();
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB down"));

    const response = await PUT(
      createPutRequest(VALID_PUT_BODY),
      routeParams("barber-1"),
    );

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
