import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";
import {
  createAdminAuthHelpers,
  createRequest,
  mockReward,
} from "../../../__tests__/helpers";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/services/admin-audit", () => ({
  extractClientIp: () => "127.0.0.1",
  logAdminAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reward: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { PUT } from "../route";

const NOW = new Date("2026-03-01T12:00:00.000Z");

const { adminAuthenticated, adminUnauthorized } =
  createAdminAuthHelpers(mockRequireAdmin);

describe("PUT /api/admin/loyalty/rewards/[id]/toggle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should return 401 when not admin", async () => {
    adminUnauthorized();

    const response = await PUT(createRequest({ active: false }), {
      params: Promise.resolve({ id: "reward-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 200 with toggled reward", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.reward.findUnique).mockResolvedValue(
      mockReward({ active: true }) as never,
    );
    vi.mocked(prisma.reward.update).mockResolvedValue(
      mockReward({ active: false, updatedAt: NOW }) as never,
    );

    const response = await PUT(createRequest({ active: false }), {
      params: Promise.resolve({ id: "reward-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      id: "reward-1",
      name: "Corte Grátis",
      active: false,
    });
  });

  it("should return 400 on invalid body", async () => {
    adminAuthenticated();

    const response = await PUT(createRequest({ active: "not-a-boolean" }), {
      params: Promise.resolve({ id: "reward-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("should return 404 when reward not found", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.reward.findUnique).mockResolvedValue(null);

    const response = await PUT(createRequest({ active: false }), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("should return 409 when trying to deactivate with active redemptions", async () => {
    adminAuthenticated();
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.reward.findUnique).mockResolvedValue(
      mockReward({ _count: { redemptions: 2 } }) as never,
    );

    const response = await PUT(createRequest({ active: false }), {
      params: Promise.resolve({ id: "reward-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("ACTIVE_REDEMPTIONS");
  });
});
