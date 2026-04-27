import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 10,
    reset: Date.now(),
  }),
  getClientIdentifier: vi.fn().mockReturnValue("test-client"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { GET } from "../route";

describe("GET /api/barbers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns barbers list", async () => {
    const barbers = [{ id: "barber-1", name: "Barbeiro", avatarUrl: null }];
    mockFindMany.mockResolvedValue(barbers);

    const request = new Request("http://localhost:3001/api/barbers");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(barbers);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
  });

  it("returns 500 when prisma throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindMany.mockRejectedValue(new Error("boom"));

    const request = new Request("http://localhost:3001/api/barbers");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
