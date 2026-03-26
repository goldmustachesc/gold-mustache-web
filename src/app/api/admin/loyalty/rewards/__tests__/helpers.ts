import type { vi } from "vitest";
import { NextResponse } from "next/server";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const NOW = new Date("2026-03-01T12:00:00.000Z");

export function createAdminAuthHelpers(
  mockRequireAdmin: ReturnType<typeof vi.fn<() => Promise<RequireAdminResult>>>,
) {
  return {
    adminAuthenticated() {
      mockRequireAdmin.mockResolvedValue({
        ok: true,
        userId: "admin-user-id",
        profileId: "admin-profile-id",
        role: "ADMIN",
      });
    },
    adminUnauthorized() {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json(
          { error: "UNAUTHORIZED", message: "Não autorizado" },
          { status: 401 },
        ),
      } as RequireAdminResult);
    },
  };
}

export function createRequest(body: unknown): Request {
  return {
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request;
}

export function mockReward(overrides: Record<string, unknown> = {}) {
  return {
    id: "reward-1",
    name: "Corte Grátis",
    description: "Um corte de cabelo grátis",
    pointsCost: 1000,
    type: "FREE_SERVICE",
    value: null,
    serviceId: null,
    imageUrl: null,
    active: true,
    stock: null,
    createdAt: NOW,
    updatedAt: NOW,
    _count: { redemptions: 0 },
    ...overrides,
  };
}
