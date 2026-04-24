import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guestClient: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    appointment: {
      findFirst: vi.fn(),
    },
  },
}));

import { PATCH } from "../route";
import { prisma } from "@/lib/prisma";

const GUEST_FIXTURE = {
  id: "guest-1",
  fullName: "Carlos Santos",
  phone: "11999997777",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

function barberAuthenticated() {
  mockRequireBarber.mockResolvedValue({
    ok: true,
    userId: "user-1",
    barberId: "barber-1",
    barberName: "Carlos",
  });
}

function barberUnauthorized() {
  mockRequireBarber.mockResolvedValue({
    ok: false,
    response: new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  } as RequireBarberResult);
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createPatchRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/barbers/me/clients/guest-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/barbers/me/clients/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await PATCH(
      createPatchRequest({ fullName: "Test", phone: "11999999999" }),
      routeParams("guest-1"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when client not found", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null as never);

    const response = await PATCH(
      createPatchRequest({ fullName: "Test", phone: "11999999999" }),
      routeParams("missing"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns 400 when trying to edit a registered client", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      id: "profile-1",
    } as never);

    const response = await PATCH(
      createPatchRequest({ fullName: "Test", phone: "11999999999" }),
      routeParams("profile-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("CANNOT_EDIT_REGISTERED");
  });

  it("returns 403 when barber has no relationship with guest", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      GUEST_FIXTURE as never,
    );
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null as never);

    const response = await PATCH(
      createPatchRequest({ fullName: "Test", phone: "11999999999" }),
      routeParams("guest-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBe("FORBIDDEN");
  });

  it("returns 400 for invalid body", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      GUEST_FIXTURE as never,
    );
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-1",
    } as never);

    const response = await PATCH(
      createPatchRequest({ fullName: "A", phone: "123" }),
      routeParams("guest-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("updates guest client successfully", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      GUEST_FIXTURE as never,
    );
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-1",
    } as never);
    vi.mocked(prisma.guestClient.update).mockResolvedValue({
      ...GUEST_FIXTURE,
      fullName: "Carlos Atualizado",
    } as never);

    const response = await PATCH(
      createPatchRequest({
        fullName: "Carlos Atualizado",
        phone: "11999997777",
      }),
      routeParams("guest-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.fullName).toBe("Carlos Atualizado");
    expect(json.data.type).toBe("guest");
  });

  it("skips phone uniqueness check when phone unchanged", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      GUEST_FIXTURE as never,
    );
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-1",
    } as never);
    vi.mocked(prisma.guestClient.update).mockResolvedValue(
      GUEST_FIXTURE as never,
    );

    await PATCH(
      createPatchRequest({
        fullName: "New Name",
        phone: "11999997777",
      }),
      routeParams("guest-1"),
    );

    expect(prisma.guestClient.findFirst).not.toHaveBeenCalled();
    expect(prisma.profile.findFirst).not.toHaveBeenCalled();
  });

  it("returns 409 when new phone exists in another guest", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      GUEST_FIXTURE as never,
    );
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-1",
    } as never);
    vi.mocked(prisma.guestClient.findFirst).mockResolvedValue({
      id: "other-guest",
    } as never);

    const response = await PATCH(
      createPatchRequest({
        fullName: "Carlos",
        phone: "11888888888",
      }),
      routeParams("guest-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("PHONE_EXISTS");
  });

  it("returns 409 when new phone exists in profile", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(
      GUEST_FIXTURE as never,
    );
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-1",
    } as never);
    vi.mocked(prisma.guestClient.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.profile.findFirst).mockResolvedValue({
      id: "existing-profile",
    } as never);

    const response = await PATCH(
      createPatchRequest({
        fullName: "Carlos",
        phone: "11888888888",
      }),
      routeParams("guest-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("PHONE_EXISTS");
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.guestClient.findUnique).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await PATCH(
      createPatchRequest({ fullName: "Test", phone: "11999999999" }),
      routeParams("guest-1"),
    );

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
