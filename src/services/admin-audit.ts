import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AdminAuditAction =
  | "REWARD_CREATE"
  | "REWARD_UPDATE"
  | "REWARD_DELETE"
  | "REWARD_TOGGLE";

export interface LogAdminAuditInput {
  actorProfileId: string;
  action: AdminAuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export interface ListAdminAuditInput {
  page: number;
  limit: number;
  action?: string;
  resourceType?: string;
  actorProfileId?: string;
  from?: Date;
  to?: Date;
}

export interface AdminAuditLogListItem {
  id: string;
  actorProfileId: string;
  actorName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Prisma.JsonValue | null;
  ipAddress: string | null;
  createdAt: Date;
}

const PII_KEYS = new Set([
  "phone",
  "email",
  "document",
  "cpf",
  "cnpj",
  "rg",
  "zipCode",
  "birthDate",
  "password",
  "passwordHash",
  "token",
]);

const REDACTED_VALUE = "[REDACTED]";

function maskPIIInternal(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskPIIInternal(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, entryValue]) => {
      if (PII_KEYS.has(key)) {
        return [key, REDACTED_VALUE];
      }
      return [key, maskPIIInternal(entryValue)];
    });
    return Object.fromEntries(entries);
  }

  return value;
}

export function maskPII<T>(value: T): T {
  return maskPIIInternal(value) as T;
}

export function maskIp(raw: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) {
    return raw;
  }
  return `${parts[0]}.${parts[1]}.xxx.xxx`;
}

function toInputJson(
  metadata?: Record<string, unknown>,
): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  return JSON.parse(JSON.stringify(maskPII(metadata))) as Prisma.InputJsonValue;
}

export function extractClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

export async function logAdminAudit(input: LogAdminAuditInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorProfileId: input.actorProfileId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: toInputJson(input.metadata),
        ipAddress: maskIp(input.ipAddress ?? null),
      },
    });
  } catch (error) {
    console.error("[admin-audit] falha ao persistir log", error);
  }
}

export async function listAdminAuditLogs(input: ListAdminAuditInput): Promise<{
  items: AdminAuditLogListItem[];
  total: number;
}> {
  const skip = (input.page - 1) * input.limit;
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(input.action ? { action: input.action } : {}),
    ...(input.resourceType ? { resourceType: input.resourceType } : {}),
    ...(input.actorProfileId ? { actorProfileId: input.actorProfileId } : {}),
    ...(input.from || input.to
      ? {
          createdAt: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lt: input.to } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      include: {
        actorProfile: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: input.limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  const items: AdminAuditLogListItem[] = rows.map((row) => ({
    id: row.id,
    actorProfileId: row.actorProfileId,
    actorName: row.actorProfile.fullName,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    metadata: maskPII(row.metadata),
    ipAddress: maskIp(row.ipAddress),
    createdAt: row.createdAt,
  }));

  return { items, total };
}
