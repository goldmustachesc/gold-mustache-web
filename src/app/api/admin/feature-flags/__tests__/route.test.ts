import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  unstable_cache: (fn: unknown) => fn,
}));

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    featureFlag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, PUT } from "../route";
import { prisma } from "@/lib/prisma";
import { FEATURE_FLAGS_CACHE_TAG } from "@/services/feature-flags";

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

function createPutRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/admin/feature-flags", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna 401 quando nao admin", async () => {
    adminUnauthorized();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("retorna flags resolvidas", async () => {
    adminAuthenticated();
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.persistenceAvailable).toBe(true);
    expect(json.data.flags).toHaveLength(3);
    expect(
      json.data.flags.find((f: { key: string }) => f.key === "loyaltyProgram")
        .enabled,
    ).toBe(false);
  });

  it("sinaliza indisponibilidade de persistencia quando o banco falha", async () => {
    adminAuthenticated();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.featureFlag.findMany).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.persistenceAvailable).toBe(false);
    expect(
      json.data.flags.find((f: { key: string }) => f.key === "loyaltyProgram")
        .enabled,
    ).toBe(false);
    errorSpy.mockRestore();
  });
});

describe("PUT /api/admin/feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna 401 quando nao admin", async () => {
    adminUnauthorized();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await PUT(
      createPutRequest({ flags: { loyaltyProgram: true } }),
    );

    expect(response.status).toBe(401);
    warnSpy.mockRestore();
  });

  it("retorna 400 para JSON invalido", async () => {
    adminAuthenticated();

    const response = await PUT(
      new Request("http://localhost:3001/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "not-json{{{",
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("INVALID_JSON");
  });

  it("retorna 400 quando flags contem chave desconhecida", async () => {
    adminAuthenticated();

    const response = await PUT(
      createPutRequest({ flags: { unknownFlag: true } }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("faz upsert das flags e revalida cache", async () => {
    adminAuthenticated();
    vi.mocked(prisma.featureFlag.upsert).mockResolvedValue({
      key: "loyaltyProgram",
      enabled: true,
      description: "Programa de fidelidade",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValue([
      {
        key: "loyaltyProgram",
        enabled: true,
        description: "Programa de fidelidade",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const response = await PUT(
      createPutRequest({ flags: { loyaltyProgram: true } }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.persistenceAvailable).toBe(true);
    expect(
      json.data.flags.find((f: { key: string }) => f.key === "loyaltyProgram")
        .enabled,
    ).toBe(true);
    expect(prisma.featureFlag.upsert).toHaveBeenCalledWith({
      where: { key: "loyaltyProgram" },
      create: {
        key: "loyaltyProgram",
        enabled: true,
        description: "Programa de fidelidade",
      },
      update: { enabled: true },
    });
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      FEATURE_FLAGS_CACHE_TAG,
      "max",
    );
  });
});
