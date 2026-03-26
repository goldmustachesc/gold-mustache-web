import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: { findUnique: vi.fn() },
  },
}));

import { GET } from "../route";
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

describe("GET /api/barbers/me", () => {
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

  it("returns barber profile with avatar", async () => {
    barberAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue({
      avatarUrl: "https://example.com/avatar.png",
    } as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.id).toBe("barber-1");
    expect(json.data.name).toBe("Carlos");
    expect(json.data.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("returns null avatarUrl when barber record has none", async () => {
    barberAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.avatarUrl).toBeNull();
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barber.findUnique).mockRejectedValue(new Error("DB down"));

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
