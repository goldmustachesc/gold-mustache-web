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
    profile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    guestClient: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

const REGISTERED_CLIENT = {
  id: "profile-1",
  fullName: "Ana Silva",
  phone: "11999998888",
  _count: { appointments: 3 },
  appointments: [{ date: new Date("2026-02-15") }],
};

const GUEST_CLIENT = {
  id: "guest-1",
  fullName: "Carlos Santos",
  phone: "11999997777",
  _count: { appointments: 1 },
  appointments: [{ date: new Date("2026-01-10") }],
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

function createGetRequest(params = ""): Request {
  return new Request(
    `http://localhost:3001/api/barbers/me/clients${params ? `?${params}` : ""}`,
  );
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/barbers/me/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/barbers/me/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(401);
  });

  it("returns merged list of registered and guest clients", async () => {
    barberAuthenticated();
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      REGISTERED_CLIENT,
    ] as never);
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([
      GUEST_CLIENT,
    ] as never);

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].fullName).toBe("Ana Silva");
    expect(json.data[0].type).toBe("registered");
    expect(json.data[1].fullName).toBe("Carlos Santos");
    expect(json.data[1].type).toBe("guest");
  });

  it("sorts clients alphabetically", async () => {
    barberAuthenticated();
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      { ...REGISTERED_CLIENT, fullName: "Zélia" },
    ] as never);
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([
      { ...GUEST_CLIENT, fullName: "André" },
    ] as never);

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data[0].fullName).toBe("André");
    expect(json.data[1].fullName).toBe("Zélia");
  });

  it("defaults fullName to 'Cliente' for registered profiles without name", async () => {
    barberAuthenticated();
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      { ...REGISTERED_CLIENT, fullName: null },
    ] as never);
    vi.mocked(prisma.guestClient.findMany).mockResolvedValue([] as never);

    const response = await GET(createGetRequest());
    const json = await response.json();

    expect(json.data[0].fullName).toBe("Cliente");
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.profile.findMany).mockRejectedValue(new Error("DB down"));

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("POST /api/barbers/me/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    barberUnauthorized();

    const response = await POST(
      createPostRequest({ fullName: "Test", phone: "11999999999" }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid body (name too short)", async () => {
    barberAuthenticated();

    const response = await POST(
      createPostRequest({ fullName: "A", phone: "11999999999" }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid phone (too few digits)", async () => {
    barberAuthenticated();

    const response = await POST(
      createPostRequest({ fullName: "João", phone: "123" }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("creates guest client successfully", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.profile.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.guestClient.create).mockResolvedValue({
      id: "new-guest",
      fullName: "João Silva",
      phone: "11999999999",
    } as never);

    const response = await POST(
      createPostRequest({ fullName: "João Silva", phone: "11999999999" }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.fullName).toBe("João Silva");
    expect(json.data.type).toBe("guest");
    expect(json.data.appointmentCount).toBe(0);
  });

  it("returns 409 when phone already exists in guestClient", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue({
      id: "existing",
    } as never);

    const response = await POST(
      createPostRequest({ fullName: "João", phone: "11999999999" }),
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("PHONE_EXISTS");
  });

  it("returns 409 when phone already exists in profile", async () => {
    barberAuthenticated();
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.profile.findFirst).mockResolvedValue({
      id: "existing-profile",
    } as never);

    const response = await POST(
      createPostRequest({ fullName: "João", phone: "11999999999" }),
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("PHONE_EXISTS");
  });

  it("returns 500 on Prisma failure", async () => {
    barberAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.guestClient.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.profile.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.guestClient.create).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await POST(
      createPostRequest({ fullName: "João", phone: "11999999999" }),
    );

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
