import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.barbers).toEqual(barbers);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
  });

  it("returns 500 when prisma throws", async () => {
    mockFindMany.mockRejectedValue(new Error("boom"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
