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
    shopClosure: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE } from "../route";
import { prisma } from "@/lib/prisma";

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

function createDeleteRequest(): Request {
  return new Request(
    "http://localhost:3001/api/admin/shop-closures/closure-1",
    { method: "DELETE" },
  );
}

describe("DELETE /api/admin/shop-closures/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("closure-1"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when closure not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.shopClosure.findUnique).mockResolvedValue(null as never);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("missing"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("hard deletes closure and returns success message", async () => {
    adminAuthenticated();
    vi.mocked(prisma.shopClosure.findUnique).mockResolvedValue({
      id: "closure-1",
    } as never);
    vi.mocked(prisma.shopClosure.delete).mockResolvedValue({} as never);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("closure-1"),
    );

    expect(response.status).toBe(200);
    expect(prisma.shopClosure.delete).toHaveBeenCalledWith({
      where: { id: "closure-1" },
    });
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.shopClosure.findUnique).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("closure-1"),
    );

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
