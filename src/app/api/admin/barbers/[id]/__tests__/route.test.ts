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
    barber: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
    },
    workingHours: {
      deleteMany: vi.fn(),
    },
    barberService: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    barberAbsence: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { GET, PUT, DELETE } from "../route";
import { prisma } from "@/lib/prisma";

const BARBER_FIXTURE = {
  id: "barber-1",
  userId: "user-1",
  name: "Carlos",
  avatarUrl: null,
  active: true,
  services: [],
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  _count: { appointments: 5, workingHours: 3 },
};

const SERVICE_ID_1 = "11111111-1111-4111-8111-111111111111";
const SERVICE_ID_2 = "22222222-2222-4222-8222-222222222222";

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
  return new Request("http://localhost:3001/api/admin/barbers/barber-1");
}

function createPutRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/admin/barbers/barber-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(): Request {
  return new Request("http://localhost:3001/api/admin/barbers/barber-1", {
    method: "DELETE",
  });
}

describe("GET /api/admin/barbers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET(createRequest(), routeParams("barber-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when barber not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);

    const response = await GET(createRequest(), routeParams("missing-id"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns barber details with counts", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );

    const response = await GET(createRequest(), routeParams("barber-1"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe("Carlos");
    expect(json.data._count.appointments).toBe(5);
    expect(json.data._count.workingHours).toBe(3);
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barber.findUnique).mockRejectedValue(new Error("DB down"));

    const response = await GET(createRequest(), routeParams("barber-1"));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });

  it("updates barber services when serviceIds is provided", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique)
      .mockResolvedValueOnce(BARBER_FIXTURE as never)
      .mockResolvedValueOnce({
        ...BARBER_FIXTURE,
        services: [
          {
            serviceId: SERVICE_ID_1,
            service: {
              id: SERVICE_ID_1,
              name: "Corte",
              duration: 30,
              price: "50",
              active: true,
            },
          },
        ],
      } as never);
    vi.mocked(prisma.service.findMany).mockResolvedValue([
      { id: SERVICE_ID_1 },
    ] as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      if (typeof callback === "function") {
        return callback({
          barber: { update: vi.fn() },
          barberService: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
          },
        } as never);
      }
      return [] as never;
    });

    const response = await PUT(
      createPutRequest({ serviceIds: [SERVICE_ID_1] }),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.services).toHaveLength(1);
    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: { id: { in: [SERVICE_ID_1] } },
      select: { id: true },
    });
  });

  it("returns 400 when one of provided serviceIds does not exist", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );
    vi.mocked(prisma.service.findMany).mockResolvedValue([
      { id: SERVICE_ID_1 },
    ] as never);

    const response = await PUT(
      createPutRequest({ serviceIds: [SERVICE_ID_1, SERVICE_ID_2] }),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("INVALID_SERVICES");
  });
});

describe("PUT /api/admin/barbers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not admin", async () => {
    adminUnauthorized();

    const response = await PUT(
      createPutRequest({ name: "Test" }),
      routeParams("barber-1"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid body (name too short)", async () => {
    adminAuthenticated();

    const response = await PUT(
      createPutRequest({ name: "A" }),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when barber not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);

    const response = await PUT(
      createPutRequest({ name: "New Name" }),
      routeParams("missing-id"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("updates barber successfully", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );
    vi.mocked(prisma.barber.update).mockResolvedValue({
      ...BARBER_FIXTURE,
      name: "New Name",
    } as never);

    const response = await PUT(
      createPutRequest({ name: "New Name" }),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe("New Name");
    expect(prisma.barber.update).toHaveBeenCalledWith({
      where: { id: "barber-1" },
      data: { name: "New Name" },
    });
  });

  it("updates barber active status", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );
    vi.mocked(prisma.barber.update).mockResolvedValue({
      ...BARBER_FIXTURE,
      active: false,
    } as never);

    const response = await PUT(
      createPutRequest({ active: false }),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.active).toBe(false);
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(
      BARBER_FIXTURE as never,
    );
    vi.mocked(prisma.barber.update).mockRejectedValue(new Error("DB down"));

    const response = await PUT(
      createPutRequest({ name: "New Name" }),
      routeParams("barber-1"),
    );

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("DELETE /api/admin/barbers/[id]", () => {
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
      routeParams("barber-1"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when barber not found", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue(null as never);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("missing-id"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("performs soft delete when barber has appointments", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue({
      ...BARBER_FIXTURE,
      _count: { appointments: 5 },
    } as never);
    vi.mocked(prisma.barber.update).mockResolvedValue({} as never);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.softDelete).toBe(true);
    expect(prisma.barber.update).toHaveBeenCalledWith({
      where: { id: "barber-1" },
      data: { active: false },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("performs hard delete with transaction when barber has no appointments", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barber.findUnique).mockResolvedValue({
      ...BARBER_FIXTURE,
      _count: { appointments: 0 },
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("barber-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.softDelete).toBe(false);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.workingHours.deleteMany).toHaveBeenCalledWith({
      where: { barberId: "barber-1" },
    });
    expect(prisma.barberService.deleteMany).toHaveBeenCalledWith({
      where: { barberId: "barber-1" },
    });
    expect(prisma.barberAbsence.deleteMany).toHaveBeenCalledWith({
      where: { barberId: "barber-1" },
    });
    expect(prisma.barber.delete).toHaveBeenCalledWith({
      where: { id: "barber-1" },
    });
  });

  it("returns 500 on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.barber.findUnique).mockRejectedValue(new Error("DB down"));

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("barber-1"),
    );

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
