import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  extractClientIp,
  listAdminAuditLogs,
  logAdminAudit,
  maskIp,
  maskPII,
} from "../admin-audit";

describe("services/admin-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extractClientIp prioriza x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "201.10.10.10, 10.0.0.1",
        "x-real-ip": "127.0.0.1",
      },
    });

    expect(extractClientIp(request)).toBe("201.10.10.10");
  });

  it("extractClientIp usa x-real-ip quando forwarded não existe", () => {
    const request = new Request("http://localhost", {
      headers: {
        "x-real-ip": "127.0.0.1",
      },
    });

    expect(extractClientIp(request)).toBe("127.0.0.1");
  });

  it("maskIp mascara IPv4 e preserva IPv6", () => {
    expect(maskIp("201.10.10.10")).toBe("201.10.xxx.xxx");
    expect(maskIp("2001:db8::1")).toBe("2001:db8::1");
    expect(maskIp(null)).toBeNull();
  });

  it("maskPII mascara chaves sensíveis", () => {
    expect(
      maskPII({
        phone: "47999998888",
        name: "Ygor",
        nested: { email: "test@gm.com", city: "Itapema" },
      }),
    ).toEqual({
      phone: "[REDACTED]",
      name: "Ygor",
      nested: { email: "[REDACTED]", city: "Itapema" },
    });
  });

  it("logAdminAudit persiste payload mascarado no banco", async () => {
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never);

    await logAdminAudit({
      actorProfileId: "admin-1",
      action: "REWARD_CREATE",
      resourceType: "reward",
      resourceId: "reward-1",
      metadata: { name: "Corte", phone: "47999998888" },
      ipAddress: "127.0.0.1",
    });

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        actorProfileId: "admin-1",
        action: "REWARD_CREATE",
        resourceType: "reward",
        resourceId: "reward-1",
        metadata: { name: "Corte", phone: "[REDACTED]" },
        ipAddress: "127.0.xxx.xxx",
      },
    });
  });

  it("listAdminAuditLogs pagina, filtra e mascara retorno", async () => {
    vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValue([
      {
        id: "audit-1",
        actorProfileId: "admin-1",
        actorProfile: {
          id: "admin-1",
          fullName: "Admin Master",
        },
        action: "REWARD_CREATE",
        resourceType: "reward",
        resourceId: "reward-1",
        metadata: { email: "admin@gm.com" },
        ipAddress: "201.10.10.10",
        createdAt: new Date("2026-04-22T17:00:00.000Z"),
      },
    ] as never);
    vi.mocked(prisma.adminAuditLog.count).mockResolvedValue(1);

    const from = new Date("2026-04-22T00:00:00.000Z");
    const to = new Date("2026-04-23T00:00:00.000Z");
    const result = await listAdminAuditLogs({
      page: 2,
      limit: 10,
      action: "REWARD_CREATE",
      resourceType: "reward",
      actorProfileId: "admin-1",
      from,
      to,
    });

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
      where: {
        action: "REWARD_CREATE",
        resourceType: "reward",
        actorProfileId: "admin-1",
        createdAt: { gte: from, lt: to },
      },
      include: {
        actorProfile: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 10,
      take: 10,
    });
    expect(prisma.adminAuditLog.count).toHaveBeenCalledWith({
      where: {
        action: "REWARD_CREATE",
        resourceType: "reward",
        actorProfileId: "admin-1",
        createdAt: { gte: from, lt: to },
      },
    });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      actorName: "Admin Master",
      metadata: { email: "[REDACTED]" },
      ipAddress: "201.10.xxx.xxx",
    });
  });
});
