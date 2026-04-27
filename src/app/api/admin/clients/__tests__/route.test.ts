import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    guestClient: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "../route";

function asAdmin() {
  mockRequireAdmin.mockResolvedValue({
    ok: true,
    userId: "user-1",
    profileId: "profile-1",
    role: "ADMIN",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  asAdmin();
  mockCheckRateLimit.mockResolvedValue({ success: true });
});

describe("GET /api/admin/clients", () => {
  it("returns 400 for invalid type", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/clients?type=unknown"),
    );

    expect(response.status).toBe(400);
  });

  it("returns registered clients when requested", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      { id: "p-1", fullName: "Ana", phone: "47999999999" } as never,
    ]);
    vi.mocked(prisma.profile.count).mockResolvedValue(1);

    const response = await GET(
      new Request("http://localhost/api/admin/clients?type=registered"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      {
        id: "p-1",
        fullName: "Ana",
        phone: "47999999999",
        type: "registered",
      },
    ]);
    expect(prisma.guestClient.findMany).not.toHaveBeenCalled();
  });

  it("returns guest clients when requested", async () => {
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([
      { id: "g-1", fullName: "Bia", phone: "47988888888" } as never,
    ]);
    vi.mocked(prisma.guestClient.count).mockResolvedValue(1);

    const response = await GET(
      new Request("http://localhost/api/admin/clients?type=guest"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      {
        id: "g-1",
        fullName: "Bia",
        phone: "47988888888",
        type: "guest",
      },
    ]);
    expect(prisma.profile.findMany).not.toHaveBeenCalled();
  });

  it("returns merged clients for all", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      { id: "p-1", fullName: "Ana", phone: "47999999999" } as never,
    ]);
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([
      { id: "g-1", fullName: "Bia", phone: "47988888888" } as never,
    ]);
    vi.mocked(prisma.profile.count).mockResolvedValue(1);
    vi.mocked(prisma.guestClient.count).mockResolvedValue(1);

    const response = await GET(
      new Request("http://localhost/api/admin/clients?type=all"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((client: { type: string }) => client.type)).toEqual([
      "registered",
      "guest",
    ]);
  });
});
