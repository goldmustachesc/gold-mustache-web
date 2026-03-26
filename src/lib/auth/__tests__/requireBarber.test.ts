import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireBarber } from "../requireBarber";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireBarber", () => {
  it("returns 401 when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await requireBarber();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 when no barber record exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    mockFindUnique.mockResolvedValue(null);

    const result = await requireBarber();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns 403 when barber is inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    mockFindUnique.mockResolvedValue({
      id: "b-1",
      name: "Carlos",
      active: false,
    });

    const result = await requireBarber();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns success for active barber", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1" } },
    });
    mockFindUnique.mockResolvedValue({
      id: "b-1",
      name: "Carlos",
      active: true,
    });

    const result = await requireBarber();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("u-1");
      expect(result.barberId).toBe("b-1");
      expect(result.barberName).toBe("Carlos");
    }
  });
});
