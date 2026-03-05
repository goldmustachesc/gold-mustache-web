import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    service: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const SERVICE_FIXTURE = {
  id: "svc-1",
  slug: "corte-masculino",
  name: "Corte Masculino",
  description: "Corte clássico",
  duration: 30,
  price: 45.0,
  active: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
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
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireAdminResult);
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/admin/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): Request {
  return new Request("http://localhost:3001/api/admin/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{{",
  });
}

const VALID_CREATE_BODY = {
  name: "Corte Masculino",
  duration: 30,
  price: 45.0,
};

describe("GET /api/admin/services", () => {
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

  it("returns list of services with price as number", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findMany).mockResolvedValue([
      SERVICE_FIXTURE,
    ] as never);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("Corte Masculino");
    expect(json.data[0].price).toBe(45);
    expect(typeof json.data[0].price).toBe("number");
    expect(typeof json.data[0].createdAt).toBe("string");
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.service.findMany).mockRejectedValue(new Error("DB down"));

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("POST /api/admin/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await POST(createPostRequest(VALID_CREATE_BODY));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    adminAuthenticated();

    const response = await POST(createInvalidJsonRequest());
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("INVALID_JSON");
  });

  it("returns 422 for invalid body (missing required fields)", async () => {
    adminAuthenticated();

    const response = await POST(createPostRequest({ name: "Test" }));
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("creates service with generated slug", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.service.create).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );

    const response = await POST(createPostRequest(VALID_CREATE_BODY));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.name).toBe("Corte Masculino");
    expect(typeof json.data.price).toBe("number");
    expect(prisma.service.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Corte Masculino",
        duration: 30,
        price: 45.0,
        active: true,
      }),
    });
  });

  it("handles slug collision by appending counter", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique)
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce(null as never);
    vi.mocked(prisma.service.create).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );

    const response = await POST(createPostRequest(VALID_CREATE_BODY));

    expect(response.status).toBe(201);
    const createCall = vi.mocked(prisma.service.create).mock.calls[0][0] as {
      data: { slug: string };
    };
    expect(createCall.data.slug).toMatch(/-1$/);
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.service.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.service.create).mockRejectedValue(new Error("DB down"));

    const response = await POST(createPostRequest(VALID_CREATE_BODY));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
