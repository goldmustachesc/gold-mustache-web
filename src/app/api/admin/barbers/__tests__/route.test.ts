import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

const mockFindAuthUserByEmail = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  findAuthUserByEmail: (...args: unknown[]) => mockFindAuthUserByEmail(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const BARBER_LIST_FIXTURE = [
  {
    id: "barber-1",
    userId: "user-1",
    name: "Carlos",
    avatarUrl: null,
    active: true,
    createdAt: new Date("2025-01-01"),
    _count: { appointments: 5 },
  },
  {
    id: "barber-2",
    userId: "user-2",
    name: "André",
    avatarUrl: "https://example.com/avatar.png",
    active: false,
    createdAt: new Date("2025-02-01"),
    _count: { appointments: 0 },
  },
];

const CREATED_BARBER = {
  id: "new-barber-id",
  userId: "auth-user-123",
  name: "João",
  avatarUrl: null,
  active: true,
  createdAt: new Date("2025-06-01"),
  updatedAt: new Date("2025-06-01"),
};

function adminAuthenticated() {
  mockRequireAdmin.mockResolvedValue({
    ok: true,
    userId: "admin-user-id",
    profileId: "admin-profile-id",
    role: "ADMIN",
  });
}

function adminUnauthorized() {
  mockRequireAdmin.mockResolvedValue({
    ok: false,
    response: new Response(
      JSON.stringify({ error: "UNAUTHORIZED", message: "Não autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  } as RequireAdminResult);
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/admin/barbers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/barbers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns list of barbers ordered by name", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findMany).mockResolvedValue(
      BARBER_LIST_FIXTURE as never,
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].name).toBe("Carlos");
    expect(json.data[1].name).toBe("André");
    expect(prisma.barber.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } }),
    );
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(prisma.barber.findMany).mockRejectedValue(new Error("DB down"));

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("POST /api/admin/barbers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await POST(
      createPostRequest({ name: "Test", email: "test@test.com" }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid body (name too short)", async () => {
    adminAuthenticated();

    const response = await POST(
      createPostRequest({ name: "A", email: "valid@test.com" }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid body (invalid email)", async () => {
    adminAuthenticated();

    const response = await POST(
      createPostRequest({ name: "João", email: "not-an-email" }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("creates barber with pending userId when email not in Supabase", async () => {
    adminAuthenticated();
    mockFindAuthUserByEmail.mockResolvedValue(null);
    vi.mocked(prisma.barber.create).mockResolvedValue(CREATED_BARBER as never);

    const response = await POST(
      createPostRequest({ name: "João", email: "joao@test.com" }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.name).toBe("João");

    const createCall = vi.mocked(prisma.barber.create).mock.calls[0][0];
    expect((createCall as { data: { userId: string } }).data.userId).toMatch(
      /^pending_/,
    );
  });

  it("creates barber linked to auth user when email found in Supabase", async () => {
    adminAuthenticated();
    mockFindAuthUserByEmail.mockResolvedValue({ id: "auth-user-123" });
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.barber.create).mockResolvedValue(CREATED_BARBER as never);

    const response = await POST(
      createPostRequest({ name: "João", email: "joao@test.com" }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.name).toBe("João");
    expect(prisma.barber.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "auth-user-123" }),
    });
  });

  it("returns 409 when auth user already has a barber profile", async () => {
    adminAuthenticated();
    mockFindAuthUserByEmail.mockResolvedValue({ id: "auth-user-123" });
    vi.mocked(prisma.barber.findUnique).mockResolvedValue({
      id: "existing-barber",
    } as never);

    const response = await POST(
      createPostRequest({ name: "João", email: "joao@test.com" }),
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("DUPLICATE");
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindAuthUserByEmail.mockResolvedValue(null);
    vi.mocked(prisma.barber.create).mockRejectedValue(new Error("DB down"));

    const response = await POST(
      createPostRequest({ name: "João", email: "joao@test.com" }),
    );

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
