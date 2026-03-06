import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin } from "../requireAdmin";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAdmin", () => {
  it("returns 401 when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns success for user with ADMIN profile", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "admin@test.com", user_metadata: {} } },
    });
    mockFindUnique.mockResolvedValue({
      id: "p-1",
      userId: "u-1",
      role: "ADMIN",
    });

    const result = await requireAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("u-1");
      expect(result.profileId).toBe("p-1");
      expect(result.role).toBe("ADMIN");
    }
  });

  it("returns 403 for user with CLIENT role", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "u-2", email: "client@test.com", user_metadata: {} },
      },
    });
    mockFindUnique.mockResolvedValue({
      id: "p-2",
      userId: "u-2",
      role: "CLIENT",
    });

    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("creates profile from metadata when no profile exists", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u-3",
          email: "new@test.com",
          user_metadata: { name: "João Silva", phone: "11999" },
        },
      },
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "p-3",
      userId: "u-3",
      role: "ADMIN",
      fullName: "João Silva",
    });

    const result = await requireAdmin();

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u-3",
        fullName: "João Silva",
        phone: "11999",
      }),
    });

    if (result.ok) {
      expect(result.profileId).toBe("p-3");
    }
  });

  it("uses email prefix as fallback name when metadata has no name", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u-4",
          email: "user@test.com",
          user_metadata: {},
        },
      },
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "p-4",
      userId: "u-4",
      role: "ADMIN",
    });

    await requireAdmin();

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fullName: "user",
      }),
    });
  });
});
