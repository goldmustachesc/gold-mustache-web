import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Prisma
const mockProfileFindUnique = vi.fn();
const mockProfileDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
      delete: (...args: unknown[]) => mockProfileDelete(...args),
    },
  },
}));

// Mock Supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

// Mock Supabase admin client
const mockDeleteUser = vi.fn();
const mockGetSupabaseAdmin = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: (...args: unknown[]) => mockGetSupabaseAdmin(...args),
}));

// Mock rate limiting
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi
    .fn()
    .mockResolvedValue({ success: true, remaining: 10, reset: 0 }),
  getClientIdentifier: vi.fn().mockReturnValue("test-ip"),
}));

// Mock origin verification
vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: vi.fn().mockReturnValue(null),
}));

// Set environment variables
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3001");

// Import the route handler after mocks
import { DELETE } from "../delete/route";

// Helper to create mock Request
function createMockRequest(): Request {
  return new Request("http://localhost:3001/api/profile/delete", {
    method: "DELETE",
    headers: {
      origin: "http://localhost:3001",
    },
  });
}

describe("DELETE /api/profile/delete", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  };

  const mockProfile = {
    id: "profile-456",
    userId: "user-123",
    fullName: "Test User",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default: admin client available with working deleteUser
    mockGetSupabaseAdmin.mockReturnValue({
      auth: {
        admin: {
          deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
        },
      },
    });

    // Setup default happy path mocks
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
    });

    mockProfileFindUnique.mockResolvedValue(mockProfile);
    mockProfileDelete.mockResolvedValue(mockProfile);
    mockDeleteUser.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const response = await DELETE(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.message).toBe("Não autorizado");
  });

  it("should delete profile and let DB cascade nullify appointment references", async () => {
    const response = await DELETE(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Conta deletada com sucesso");

    expect(mockProfileFindUnique).toHaveBeenCalledWith({
      where: { userId: mockUser.id },
    });

    expect(mockProfileDelete).toHaveBeenCalledWith({
      where: { id: mockProfile.id },
    });
  });

  it("should delete user from Supabase Auth when service key is available", async () => {
    const response = await DELETE(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify user was deleted from Supabase Auth
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
  });

  it("should succeed even if user has no profile", async () => {
    mockProfileFindUnique.mockResolvedValue(null);

    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await DELETE(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Auth user should still be deleted even without a profile
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);

    // No profile delete needed when profile doesn't exist
    expect(mockProfileDelete).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should abort with 500 if Supabase Auth deletion fails", async () => {
    mockDeleteUser.mockResolvedValue({
      error: { message: "Auth deletion failed" },
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await DELETE(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("DELETE_FAILED");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Account Delete] Auth deletion failed, aborting:",
      expect.objectContaining({
        userId: mockUser.id,
        error: "Auth deletion failed",
      }),
    );

    expect(mockProfileDelete).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should return 200 on database error when auth already deleted (partial delete)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    mockProfileDelete.mockRejectedValue(new Error("Database error"));

    const response = await DELETE(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Account Delete] PARTIAL DELETE - auth deleted but DB cleanup failed:",
      expect.objectContaining({
        userId: mockUser.id,
        profileId: mockProfile.id,
        authDeleted: true,
        error: "Database error",
      }),
    );

    consoleSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("should not delete appointments directly (relies on DB cascade)", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await DELETE(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockProfileDelete).toHaveBeenCalledWith({
      where: { id: mockProfile.id },
    });
    infoSpy.mockRestore();
  });

  it("should return 500 when service role key is not set", async () => {
    mockGetSupabaseAdmin.mockReturnValue(null);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await DELETE(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("CONFIG_ERROR");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Account Delete] SUPABASE_SERVICE_ROLE_KEY not configured - cannot safely delete account",
    );

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockProfileDelete).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
