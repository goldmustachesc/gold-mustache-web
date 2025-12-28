import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Prisma
const mockPrismaTransaction = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockAppointmentDeleteMany = vi.fn();
const mockProfileDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
      delete: (...args: unknown[]) => mockProfileDelete(...args),
    },
    appointment: {
      deleteMany: (...args: unknown[]) => mockAppointmentDeleteMany(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
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
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      admin: {
        deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
      },
    },
  }),
}));

// Set environment variables
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

// Import the route handler after mocks
import { DELETE } from "../delete/route";

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

    // Setup default happy path mocks
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
    });

    mockProfileFindUnique.mockResolvedValue(mockProfile);

    mockPrismaTransaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          appointment: {
            deleteMany: mockAppointmentDeleteMany,
          },
          profile: {
            delete: mockProfileDelete,
          },
        };
        return callback(tx);
      },
    );

    mockAppointmentDeleteMany.mockResolvedValue({ count: 2 });
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

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
    expect(body.message).toBe("Não autorizado");
  });

  it("should delete appointments and profile within transaction", async () => {
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Conta deletada com sucesso");

    // Verify profile was looked up
    expect(mockProfileFindUnique).toHaveBeenCalledWith({
      where: { userId: mockUser.id },
    });

    // Verify transaction was executed
    expect(mockPrismaTransaction).toHaveBeenCalled();

    // Verify appointments were deleted with profile.id
    expect(mockAppointmentDeleteMany).toHaveBeenCalledWith({
      where: { clientId: mockProfile.id },
    });

    // Verify profile was deleted
    expect(mockProfileDelete).toHaveBeenCalledWith({
      where: { id: mockProfile.id },
    });
  });

  it("should delete user from Supabase Auth when service key is available", async () => {
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify user was deleted from Supabase Auth
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser.id);
  });

  it("should succeed even if user has no profile", async () => {
    mockProfileFindUnique.mockResolvedValue(null);

    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // No transaction needed when profile doesn't exist
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
    expect(mockAppointmentDeleteMany).not.toHaveBeenCalled();
    expect(mockProfileDelete).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should succeed even if Supabase Auth deletion fails", async () => {
    mockDeleteUser.mockResolvedValue({
      error: { message: "Auth deletion failed" },
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Should log the error but still succeed
    expect(consoleSpy).toHaveBeenCalledWith(
      `[Account Delete] Failed to delete auth user ${mockUser.id}:`,
      "Auth deletion failed",
    );

    consoleSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("should return 500 on database error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockPrismaTransaction.mockRejectedValue(new Error("Database error"));

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
    expect(body.message).toBe("Erro ao deletar conta");

    consoleSpy.mockRestore();
  });

  it("should handle user with no appointments", async () => {
    mockAppointmentDeleteMany.mockResolvedValue({ count: 0 });

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockAppointmentDeleteMany).toHaveBeenCalled();
  });

  it("should warn when service role key is not set", async () => {
    // Temporarily remove the service key
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Account Delete] SUPABASE_SERVICE_ROLE_KEY not configured - auth user not deleted",
    );

    // Restore the key
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    consoleSpy.mockRestore();
    infoSpy.mockRestore();
  });
});
