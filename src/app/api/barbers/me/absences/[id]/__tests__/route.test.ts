import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barberAbsence: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { DELETE } from "../route";
import { prisma } from "@/lib/prisma";

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

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createDeleteRequest(scope?: "occurrence" | "series"): Request {
  return new Request(
    `http://localhost:3001/api/barbers/me/absences/abs-1${scope ? `?scope=${scope}` : ""}`,
    {
      method: "DELETE",
    },
  );
}

describe("DELETE /api/barbers/me/absences/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await DELETE(createDeleteRequest(), routeParams("abs-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when absence not found", async () => {
    barberAuthenticated();
    vi.mocked(prisma.barberAbsence.findUnique).mockResolvedValue(null as never);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("missing"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns 404 when absence belongs to another barber", async () => {
    barberAuthenticated();
    vi.mocked(prisma.barberAbsence.findUnique).mockResolvedValue({
      id: "abs-1",
      barberId: "other-barber",
    } as never);

    const response = await DELETE(createDeleteRequest(), routeParams("abs-1"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("deletes own absence successfully", async () => {
    barberAuthenticated();
    vi.mocked(prisma.barberAbsence.findUnique).mockResolvedValue({
      id: "abs-1",
      barberId: "barber-1",
    } as never);
    vi.mocked(prisma.barberAbsence.delete).mockResolvedValue({} as never);

    const response = await DELETE(createDeleteRequest(), routeParams("abs-1"));

    expect(response.status).toBe(200);
    expect(prisma.barberAbsence.delete).toHaveBeenCalledWith({
      where: { id: "abs-1" },
    });
  });

  it("deletes the remaining series occurrences when requested", async () => {
    barberAuthenticated();
    vi.mocked(prisma.barberAbsence.findUnique).mockResolvedValue({
      id: "abs-1",
      barberId: "barber-1",
      recurrenceId: "rec-1",
      date: new Date("2026-03-15T00:00:00.000Z"),
    } as never);
    vi.mocked(prisma.barberAbsence.deleteMany).mockResolvedValue({
      count: 3,
    } as never);

    const response = await DELETE(
      createDeleteRequest("series"),
      routeParams("abs-1"),
    );

    expect(response.status).toBe(200);
    expect(prisma.barberAbsence.deleteMany).toHaveBeenCalledWith({
      where: {
        barberId: "barber-1",
        recurrenceId: "rec-1",
        date: { gte: expect.any(Date) },
      },
    });
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barberAbsence.findUnique).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await DELETE(createDeleteRequest(), routeParams("abs-1"));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
