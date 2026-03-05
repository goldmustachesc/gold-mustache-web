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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GET, PUT, DELETE } from "../route";
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

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(): Request {
  return new Request("http://localhost:3001/api/admin/services/svc-1");
}

function createPutRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/admin/services/svc-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): Request {
  return new Request("http://localhost:3001/api/admin/services/svc-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{{",
  });
}

function createDeleteRequest(): Request {
  return new Request("http://localhost:3001/api/admin/services/svc-1", {
    method: "DELETE",
  });
}

describe("GET /api/admin/services/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET(createRequest(), routeParams("svc-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when service not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(null as never);

    const response = await GET(createRequest(), routeParams("missing"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns service with price as number", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );

    const response = await GET(createRequest(), routeParams("svc-1"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe("Corte Masculino");
    expect(json.data.price).toBe(45);
    expect(typeof json.data.price).toBe("number");
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.service.findUnique).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET(createRequest(), routeParams("svc-1"));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("PUT /api/admin/services/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await PUT(
      createPutRequest({ name: "X" }),
      routeParams("svc-1"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when service not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(null as never);

    const response = await PUT(
      createPutRequest({ name: "New Name" }),
      routeParams("missing"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid JSON", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );

    const response = await PUT(
      createInvalidJsonRequest(),
      routeParams("svc-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("INVALID_JSON");
  });

  it("returns 422 for invalid body", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );

    const response = await PUT(
      createPutRequest({ duration: -5 }),
      routeParams("svc-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("updates service without changing slug when name unchanged", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );
    vi.mocked(prisma.service.update).mockResolvedValue({
      ...SERVICE_FIXTURE,
      duration: 45,
    } as never);

    const response = await PUT(
      createPutRequest({ duration: 45 }),
      routeParams("svc-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.duration).toBe(45);
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: "svc-1" },
      data: { duration: 45 },
    });
  });

  it("regenerates slug when name changes", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique)
      .mockResolvedValueOnce(SERVICE_FIXTURE as never)
      .mockResolvedValueOnce(null as never);
    vi.mocked(prisma.service.update).mockResolvedValue({
      ...SERVICE_FIXTURE,
      name: "Barba Completa",
      slug: "barba-completa",
    } as never);

    const response = await PUT(
      createPutRequest({ name: "Barba Completa" }),
      routeParams("svc-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe("Barba Completa");
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: "svc-1" },
      data: expect.objectContaining({
        name: "Barba Completa",
        slug: expect.any(String),
      }),
    });
  });

  it("skips slug collision for own record", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique)
      .mockResolvedValueOnce(SERVICE_FIXTURE as never)
      .mockResolvedValueOnce({ id: "svc-1" } as never);
    vi.mocked(prisma.service.update).mockResolvedValue({
      ...SERVICE_FIXTURE,
      name: "Novo Nome",
      slug: "novo-nome",
    } as never);

    const response = await PUT(
      createPutRequest({ name: "Novo Nome" }),
      routeParams("svc-1"),
    );

    expect(response.status).toBe(200);
    const updateCall = vi.mocked(prisma.service.update).mock.calls[0][0] as {
      data: { slug?: string };
    };
    expect(updateCall.data.slug).not.toMatch(/-\d+$/);
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.service.findUnique).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );
    vi.mocked(prisma.service.update).mockRejectedValue(new Error("DB down"));

    const response = await PUT(
      createPutRequest({ duration: 45 }),
      routeParams("svc-1"),
    );

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("DELETE /api/admin/services/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await DELETE(createDeleteRequest(), routeParams("svc-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when service not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(null as never);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("missing"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("soft deletes service by setting active to false", async () => {
    adminAuthenticated();
    vi.mocked(prisma.service.findUnique).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );
    vi.mocked(prisma.service.update).mockResolvedValue({
      ...SERVICE_FIXTURE,
      active: false,
    } as never);

    const response = await DELETE(createDeleteRequest(), routeParams("svc-1"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.active).toBe(false);
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: "svc-1" },
      data: { active: false },
    });
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.service.findUnique).mockResolvedValue(
      SERVICE_FIXTURE as never,
    );
    vi.mocked(prisma.service.update).mockRejectedValue(new Error("DB down"));

    const response = await DELETE(createDeleteRequest(), routeParams("svc-1"));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
