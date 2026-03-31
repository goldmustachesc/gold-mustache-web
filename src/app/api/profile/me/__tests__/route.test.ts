import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockProfileCreate = vi.fn();
const mockProfileUpdate = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetUserRateLimitIdentifier = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
      create: (...args: unknown[]) => mockProfileCreate(...args),
      update: (...args: unknown[]) => mockProfileUpdate(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getUserRateLimitIdentifier: (...args: unknown[]) =>
    mockGetUserRateLimitIdentifier(...args),
}));

import { GET, PUT } from "../route";

describe("GET /api/profile/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetUserRateLimitIdentifier.mockImplementation((userId: unknown) => {
      return `auth:${String(userId)}`;
    });
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const request = new Request("http://localhost:3001/api/profile/me");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new Request("http://localhost:3001/api/profile/me");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns profile when it already exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@test.com" } },
    });

    mockProfileFindUnique.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      fullName: "João",
      avatarUrl: null,
      phone: "11999998888",
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
      emailVerified: true,
      role: "CLIENT",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
    });

    const request = new Request("http://localhost:3001/api/profile/me");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.profile.id).toBe("profile-1");
    expect(body.data.email).toBe("user@test.com");
    expect(mockCheckRateLimit).toHaveBeenCalledWith("api", "auth:user-1");
  });

  it("creates profile when missing without auto-linking guest appointments", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@test.com",
          user_metadata: { name: "João", phone: "11999998888" },
        },
      },
    });

    mockProfileFindUnique.mockResolvedValue(null);
    mockProfileCreate.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      fullName: "João",
      avatarUrl: null,
      phone: "11999998888",
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
      emailVerified: false,
      role: "CLIENT",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
    });

    const request = new Request("http://localhost:3001/api/profile/me");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.profile.id).toBe("profile-1");
  });
});

describe("PUT /api/profile/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetUserRateLimitIdentifier.mockImplementation((userId: unknown) => {
      return `auth:${String(userId)}`;
    });
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const response = await PUT(
      new Request("http://localhost:3001/api/profile/me", {
        method: "PUT",
        body: JSON.stringify({}),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await PUT(
      new Request("http://localhost:3001/api/profile/me", {
        method: "PUT",
        body: JSON.stringify({}),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 400 when validation fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await PUT(
      new Request("http://localhost:3001/api/profile/me", {
        method: "PUT",
        body: JSON.stringify({ state: "XX" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("updates profile without auto-linking guest appointments on phone change", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    mockProfileUpdate.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      fullName: "João",
      avatarUrl: null,
      phone: "11999998888",
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
      emailVerified: false,
      role: "CLIENT",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
    });

    const response = await PUT(
      new Request("http://localhost:3001/api/profile/me", {
        method: "PUT",
        body: JSON.stringify({ phone: " 11999998888 " }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.profile.id).toBe("profile-1");
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { phone: "11999998888" },
    });
    expect(mockCheckRateLimit).toHaveBeenCalledWith("api", "auth:user-1");
  });
});
