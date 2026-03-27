import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  unstable_cache: (fn: unknown) => fn,
}));

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barbershopSettings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, PUT } from "../route";
import { prisma } from "@/lib/prisma";
import { BARBERSHOP_SETTINGS_CACHE_TAG } from "@/services/barbershop-settings";

const SETTINGS_FIXTURE = {
  id: "default",
  name: "Gold Mustache",
  shortName: "GM",
  tagline: "Barbearia Premium",
  description: null,
  street: "Rua A",
  number: "10",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  zipCode: "01000-000",
  country: "BR",
  latitude: -23.55,
  longitude: -46.63,
  phone: "11999998888",
  whatsapp: "11999998888",
  email: "contato@gold.com",
  instagramMain: "@goldmustache",
  instagramStore: null,
  googleMapsUrl: null,
  bookingEnabled: true,
  externalBookingUrl: null,
  featuredEnabled: true,
  featuredBadge: "Mais Popular",
  featuredTitle: "Combo Completo",
  featuredDescription: "Corte + Barba + Sobrancelha",
  featuredDuration: "60 minutos",
  featuredOriginalPrice: 115,
  featuredDiscountedPrice: 100,
  foundingYear: 2020,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-06-01T00:00:00.000Z"),
};

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
    response: new Response(
      JSON.stringify({ error: "UNAUTHORIZED", message: "Não autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  } as RequireAdminResult);
}

function createPutRequest(body: unknown): Request {
  return new Request("http://localhost:3001/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createInvalidJsonRequest(): Request {
  return new Request("http://localhost:3001/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{{",
  });
}

describe("GET /api/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when not admin", async () => {
    adminUnauthorized();

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("should return existing settings from DB", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barbershopSettings.findUnique).mockResolvedValue(
      SETTINGS_FIXTURE as never,
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe("Gold Mustache");
    expect(json.data.id).toBe("default");
  });

  it("should create default settings when none exist", async () => {
    adminAuthenticated();
    vi.mocked(prisma.barbershopSettings.findUnique).mockResolvedValue(
      null as never,
    );
    vi.mocked(prisma.barbershopSettings.create).mockResolvedValue(
      SETTINGS_FIXTURE as never,
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.barbershopSettings.create).toHaveBeenCalledWith({
      data: { id: "default" },
    });
    expect(json.data.name).toBe("Gold Mustache");
  });

  it("should return error on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(prisma.barbershopSettings.findUnique).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("PUT /api/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when not admin", async () => {
    adminUnauthorized();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await PUT(createPutRequest({ name: "Test" }));

    expect(response.status).toBe(401);
    warnSpy.mockRestore();
  });

  it("should return 400 for invalid JSON body", async () => {
    adminAuthenticated();

    const response = await PUT(createInvalidJsonRequest());
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("INVALID_JSON");
  });

  it("should return 400 for invalid data", async () => {
    adminAuthenticated();

    const response = await PUT(
      createPutRequest({ email: "not-an-email", state: "TOOLONG" }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("should update settings and call revalidateTag with tag and profile", async () => {
    adminAuthenticated();
    const updatePayload = { name: "Gold Mustache V2", tagline: "New Tagline" };
    const updatedSettings = { ...SETTINGS_FIXTURE, ...updatePayload };

    vi.mocked(prisma.barbershopSettings.upsert).mockResolvedValue(
      updatedSettings as never,
    );

    const response = await PUT(createPutRequest(updatePayload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe("Gold Mustache V2");
    expect(prisma.barbershopSettings.upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      update: updatePayload,
      create: { id: "default", ...updatePayload },
    });
    expect(mockRevalidateTag).toHaveBeenCalledWith(
      BARBERSHOP_SETTINGS_CACHE_TAG,
      "max",
    );
  });

  it("should return error on Prisma failure", async () => {
    adminAuthenticated();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(prisma.barbershopSettings.upsert).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await PUT(createPutRequest({ name: "Test" }));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });

  it("should update featured service settings", async () => {
    adminAuthenticated();
    const updatePayload = {
      featuredEnabled: false,
      featuredBadge: "Oferta Especial",
      featuredTitle: "Super Combo",
      featuredDescription: "O melhor combo da cidade",
      featuredDuration: "90 minutos",
      featuredOriginalPrice: 200,
      featuredDiscountedPrice: 150,
    };
    const updatedSettings = { ...SETTINGS_FIXTURE, ...updatePayload };

    vi.mocked(prisma.barbershopSettings.upsert).mockResolvedValue(
      updatedSettings as never,
    );

    const response = await PUT(createPutRequest(updatePayload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.featuredEnabled).toBe(false);
    expect(json.data.featuredBadge).toBe("Oferta Especial");
    expect(json.data.featuredTitle).toBe("Super Combo");
    expect(json.data.featuredOriginalPrice).toBe(200);
    expect(json.data.featuredDiscountedPrice).toBe(150);
  });

  it("should reject invalid featured price (negative)", async () => {
    adminAuthenticated();

    const response = await PUT(
      createPutRequest({ featuredOriginalPrice: -10 }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });

  it("should reject discounted price greater than original price", async () => {
    adminAuthenticated();

    const response = await PUT(
      createPutRequest({
        featuredOriginalPrice: 100,
        featuredDiscountedPrice: 150,
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("VALIDATION_ERROR");
  });
});
