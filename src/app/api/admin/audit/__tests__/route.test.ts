import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
const mockListAdminAuditLogs = vi.fn();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/services/admin-audit", () => ({
  listAdminAuditLogs: (...args: unknown[]) => mockListAdminAuditLogs(...args),
}));

import { GET } from "../route";

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
      JSON.stringify({
        error: "UNAUTHORIZED",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  } as RequireAdminResult);
}

function createRequest(params = "") {
  return new Request(
    `http://localhost:3001/api/admin/audit${params ? `?${params}` : ""}`,
  );
}

describe("GET /api/admin/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminAuthenticated();
    mockListAdminAuditLogs.mockResolvedValue({
      items: [
        {
          id: "audit-1",
          actorProfileId: "admin-profile-id",
          actorName: "Admin",
          action: "REWARD_CREATE",
          resourceType: "reward",
          resourceId: "reward-1",
          metadata: { name: "Corte" },
          ipAddress: "201.10.xxx.xxx",
          createdAt: new Date("2026-04-22T18:00:00.000Z"),
        },
      ],
      total: 1,
    });
  });

  it("retorna 401 quando não autenticado como admin", async () => {
    adminUnauthorized();

    const response = await GET(createRequest());
    expect(response.status).toBe(401);
  });

  it("retorna coleção paginada de logs", async () => {
    const response = await GET(createRequest("page=2&limit=10"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockListAdminAuditLogs).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      action: undefined,
      resourceType: undefined,
      actorProfileId: undefined,
      from: undefined,
      to: undefined,
    });
    expect(json.data).toHaveLength(1);
    expect(json.meta).toMatchObject({
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });
  });

  it("aplica filtros de query e parse de datas", async () => {
    await GET(
      createRequest(
        "page=1&limit=50&action=REWARD_UPDATE&resourceType=reward&actorProfileId=550e8400-e29b-41d4-a716-446655440000&from=2026-04-01&to=2026-04-30",
      ),
    );

    const call = mockListAdminAuditLogs.mock.calls[0][0] as {
      from: Date;
      to: Date;
    };
    expect(call.from.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(call.to.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("retorna 400 para query inválida", async () => {
    const response = await GET(createRequest("page=0&limit=500"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
    expect(mockListAdminAuditLogs).not.toHaveBeenCalled();
  });

  it("retorna 400 para intervalo de datas inválido", async () => {
    const response = await GET(createRequest("from=2026-04-30&to=2026-04-01"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
    expect(mockListAdminAuditLogs).not.toHaveBeenCalled();
  });
});
