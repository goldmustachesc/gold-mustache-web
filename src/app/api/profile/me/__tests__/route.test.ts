import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockProfileCreate = vi.fn();
const mockProfileUpdate = vi.fn();
const mockLinkGuestAppointments = vi.fn();

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

vi.mock("@/services/guest-linking", () => ({
  linkGuestAppointmentsToProfile: (...args: unknown[]) =>
    mockLinkGuestAppointments(...args),
}));

import { GET, PUT } from "../route";

describe("GET /api/profile/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET();
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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.id).toBe("profile-1");
    expect(body.email).toBe("user@test.com");
  });

  it("creates profile when missing and links guest appointments", async () => {
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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.id).toBe("profile-1");
    expect(mockLinkGuestAppointments).toHaveBeenCalledWith(
      "profile-1",
      "11999998888",
    );
  });
});

describe("PUT /api/profile/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("updates profile and links guest appointments on phone change", async () => {
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
    expect(body.profile.id).toBe("profile-1");
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { phone: "11999998888" },
    });
    expect(mockLinkGuestAppointments).toHaveBeenCalledWith(
      "profile-1",
      "11999998888",
    );
  });
});
