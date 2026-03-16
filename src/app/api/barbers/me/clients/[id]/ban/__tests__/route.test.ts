import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireBarberResult } from "@/lib/auth/requireBarber";

const mockRequireBarber = vi.fn<() => Promise<RequireBarberResult>>();
vi.mock("@/lib/auth/requireBarber", () => ({
  requireBarber: () => mockRequireBarber(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

const mockBanClient = vi.fn();
const mockUnbanClient = vi.fn();
vi.mock("@/services/banned-client", () => ({
  banClient: (...args: unknown[]) => mockBanClient(...args),
  unbanClient: (...args: unknown[]) => mockUnbanClient(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    guestClient: { findUnique: vi.fn() },
    bannedClient: { findFirst: vi.fn() },
  },
}));

import { POST, DELETE } from "../route";
import { prisma } from "@/lib/prisma";

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

function createPostRequest(body: unknown): Request {
  return new Request(
    "http://localhost:3001/api/barbers/me/clients/test-id/ban",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function createDeleteRequest(): Request {
  return new Request(
    "http://localhost:3001/api/barbers/me/clients/test-id/ban",
    {
      method: "DELETE",
    },
  );
}

describe("POST /api/barbers/me/clients/[id]/ban", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();
    const response = await POST(createPostRequest({}), routeParams("client-1"));
    expect(response.status).toBe(401);
  });

  it("bans a registered client successfully", async () => {
    barberAuthenticated();

    (prisma.profile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "client-1",
      fullName: "Carlos",
    });
    (
      prisma.guestClient.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    const banResult = {
      id: "ban-1",
      profileId: "client-1",
      guestClientId: null,
      reason: "Comportamento inadequado",
      bannedBy: "barber-1",
      createdAt: new Date(),
    };
    mockBanClient.mockResolvedValue(banResult);

    const response = await POST(
      createPostRequest({ reason: "Comportamento inadequado" }),
      routeParams("client-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(mockBanClient).toHaveBeenCalledWith({
      clientId: "client-1",
      clientType: "registered",
      reason: "Comportamento inadequado",
      bannedByBarberId: "barber-1",
    });
  });

  it("bans a guest client successfully", async () => {
    barberAuthenticated();

    (prisma.profile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (
      prisma.guestClient.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "guest-1",
      fullName: "João",
    });

    const banResult = {
      id: "ban-2",
      profileId: null,
      guestClientId: "guest-1",
      reason: null,
      bannedBy: "barber-1",
      createdAt: new Date(),
    };
    mockBanClient.mockResolvedValue(banResult);

    const response = await POST(createPostRequest({}), routeParams("guest-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(mockBanClient).toHaveBeenCalledWith({
      clientId: "guest-1",
      clientType: "guest",
      reason: undefined,
      bannedByBarberId: "barber-1",
    });
  });

  it("returns 404 when client not found", async () => {
    barberAuthenticated();

    (prisma.profile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (
      prisma.guestClient.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    const response = await POST(
      createPostRequest({}),
      routeParams("non-existent"),
    );
    expect(response.status).toBe(404);
  });

  it("returns 409 when client is already banned", async () => {
    barberAuthenticated();

    (prisma.profile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "client-1",
    });

    mockBanClient.mockRejectedValue(new Error("CLIENT_ALREADY_BANNED"));

    const response = await POST(createPostRequest({}), routeParams("client-1"));
    expect(response.status).toBe(409);
  });
});

describe("DELETE /api/barbers/me/clients/[id]/ban", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();
    const response = await DELETE(createDeleteRequest(), routeParams("ban-1"));
    expect(response.status).toBe(401);
  });

  it("unbans a client successfully", async () => {
    barberAuthenticated();

    (
      prisma.bannedClient.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "ban-1",
      profileId: "client-1",
    });

    mockUnbanClient.mockResolvedValue(undefined);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("client-1"),
    );

    expect(response.status).toBe(200);
    expect(mockUnbanClient).toHaveBeenCalledWith("ban-1");
  });

  it("returns 404 when no ban found for client", async () => {
    barberAuthenticated();

    (
      prisma.bannedClient.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    const response = await DELETE(
      createDeleteRequest(),
      routeParams("client-1"),
    );
    expect(response.status).toBe(404);
  });
});
