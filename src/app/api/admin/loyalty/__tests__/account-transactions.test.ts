import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pointTransaction: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from "../accounts/[accountId]/transactions/route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function makeRequest(
  accountId: string,
  searchParams?: Record<string, string>,
): Request {
  const url = new URL(
    `http://localhost:3000/api/admin/loyalty/accounts/${accountId}/transactions`,
  );
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url);
}

function makeContext(accountId: string) {
  return { params: Promise.resolve({ accountId }) };
}

describe("GET /api/admin/loyalty/accounts/:accountId/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      userId: "admin-user-id",
      profileId: "admin-profile-id",
      role: "ADMIN",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when admin is not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      ),
    } as RequireAdminResult);

    const response = await GET(
      makeRequest(VALID_UUID),
      makeContext(VALID_UUID),
    );

    expect(response.status).toBe(401);
  });

  it("returns paginated transactions for the specific account", async () => {
    const { prisma } = await import("@/lib/prisma");
    const createdAt = new Date("2026-02-01T12:00:00.000Z");
    const expiresAt = new Date("2027-02-01T12:00:00.000Z");

    const rows = [
      {
        id: "tx-1",
        loyaltyAccountId: VALID_UUID,
        type: "EARNED_APPOINTMENT" as const,
        points: 50,
        description: "Agendamento",
        referenceId: "ref-1",
        expiresAt,
        createdAt,
      },
    ];

    vi.mocked(prisma.pointTransaction.findMany).mockResolvedValue(
      rows as never,
    );
    vi.mocked(prisma.pointTransaction.count).mockResolvedValue(1);

    const response = await GET(
      makeRequest(VALID_UUID, { page: "1", limit: "10" }),
      makeContext(VALID_UUID),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.pointTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { loyaltyAccountId: VALID_UUID },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      }),
    );
    expect(prisma.pointTransaction.count).toHaveBeenCalledWith({
      where: { loyaltyAccountId: VALID_UUID },
    });

    expect(json.data).toMatchObject({
      data: [
        expect.objectContaining({
          id: "tx-1",
          loyaltyAccountId: VALID_UUID,
          type: "EARNED_APPOINTMENT",
          points: 50,
          description: "Agendamento",
          referenceId: "ref-1",
          expiresAt: expiresAt.toISOString(),
          createdAt: createdAt.toISOString(),
        }),
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });
});
