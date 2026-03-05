import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
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
    workingHours: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { GET, PUT } from "../route";
import { prisma } from "@/lib/prisma";

const WORKING_HOURS_RESPONSE = [
  { dayOfWeek: 1, isWorking: true, startTime: "09:00", endTime: "18:00" },
];

function barberAuthenticated() {
  mockRequireBarber.mockResolvedValue({
    ok: true,
    userId: "user-1",
    barberId: "barber-1",
    barberName: "Carlos",
  });
}

function barberUnauthorized() {
  mockRequireBarber.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireBarberResult);
}

function createPutRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/barbers/me/working-hours", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): Request {
  return new Request("http://localhost:3001/api/barbers/me/working-hours", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{{",
  });
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

describe("GET /api/barbers/me/working-hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns barber working hours", async () => {
    barberAuthenticated();
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([] as never);
    mockBuildWorkingHoursResponse.mockReturnValue(WORKING_HOURS_RESPONSE);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(WORKING_HOURS_RESPONSE);
    expect(prisma.workingHours.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { barberId: "barber-1" },
      }),
    );
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.workingHours.findMany).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("PUT /api/barbers/me/working-hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertWorkingHoursInTransaction.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await PUT(createPutRequest(VALID_PUT_BODY));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    barberAuthenticated();

    const response = await PUT(createInvalidJsonRequest());
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("INVALID_JSON");
  });

  it("returns 422 for invalid body", async () => {
    barberAuthenticated();

    const response = await PUT(createPutRequest({ days: [] }));
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("updates working hours via transaction", async () => {
    barberAuthenticated();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === "function") return fn(prisma);
    });
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([] as never);
    mockBuildWorkingHoursResponse.mockReturnValue(WORKING_HOURS_RESPONSE);

    const response = await PUT(createPutRequest(VALID_PUT_BODY));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(WORKING_HOURS_RESPONSE);
    expect(mockUpsertWorkingHoursInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      "barber-1",
      expect.any(Array),
    );
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB down"));

    const response = await PUT(createPutRequest(VALID_PUT_BODY));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
