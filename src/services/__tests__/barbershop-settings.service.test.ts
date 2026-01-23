import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    barbershopSettings: {
      findUnique: vi.fn(),
    },
  };

  return { prisma };
});

import { prisma } from "@/lib/prisma";
import { barbershopConfig } from "@/config/barbershop";
import { getBarbershopSettings } from "../barbershop-settings";

function asMock(fn: unknown): MockInstance {
  return fn as MockInstance;
}

describe("services/barbershop-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns mapped settings when DB settings exist", async () => {
    const dbSettings = {
      id: "default",
      name: "Gold Mustache",
      shortName: "GM",
      tagline: "Tagline",
      description: null,
      street: "Rua A",
      number: "10",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01000-000",
      country: "Brasil",
      latitude: "-23.0",
      longitude: "-46.0",
      phone: "11999998888",
      whatsapp: "11999998888",
      email: "contato@gold.com",
      instagramMain: "@goldmustache",
      instagramStore: "@goldstore",
      googleMapsUrl: "",
      bookingEnabled: false,
      externalBookingUrl: "https://example.com",
      foundingYear: 2000,
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    };

    asMock(prisma.barbershopSettings.findUnique).mockResolvedValue(dbSettings);

    const result = await getBarbershopSettings();

    const fullAddress = "Rua A, 10 - Centro, São Paulo - SP, 01000-000";

    expect(result.name).toBe(dbSettings.name);
    expect(result.description).toBe(barbershopConfig.description);
    expect(result.address.full).toBe(fullAddress);
    expect(result.address.withName).toBe(`${fullAddress} - Gold Mustache`);
    expect(result.coordinates.lat).toBe(-23.0);
    expect(result.coordinates.lng).toBe(-46.0);
    expect(result.social.instagram.mainUrl).toBe(
      "https://instagram.com/goldmustache",
    );
    expect(result.social.instagram.storeUrl).toBe(
      "https://instagram.com/goldstore",
    );
    expect(result.social.googleMaps).toBe(barbershopConfig.social.googleMaps);
    expect(result.bookingEnabled).toBe(false);
    expect(result.externalBookingUrl).toBe("https://example.com");
    expect(result.updatedAt?.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("maps optional instagram store and google maps url when provided", async () => {
    const dbSettings = {
      id: "default",
      name: "Gold Mustache",
      shortName: "GM",
      tagline: "Tagline",
      description: "Descrição",
      street: "Rua B",
      number: "20",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "02000-000",
      country: "Brasil",
      latitude: "10",
      longitude: "20",
      phone: "11999998888",
      whatsapp: "11999998888",
      email: "contato@gold.com",
      instagramMain: "@goldmustache",
      instagramStore: null,
      googleMapsUrl: "https://maps.example.com",
      bookingEnabled: true,
      externalBookingUrl: "https://example.com",
      foundingYear: 2000,
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    };

    asMock(prisma.barbershopSettings.findUnique).mockResolvedValue(dbSettings);

    const result = await getBarbershopSettings();

    expect(result.social.instagram.storeUrl).toBeNull();
    expect(result.social.googleMaps).toBe("https://maps.example.com");
  });

  it("falls back to config when DB settings are missing", async () => {
    asMock(prisma.barbershopSettings.findUnique).mockResolvedValue(null);

    const result = await getBarbershopSettings();

    expect(result.name).toBe(barbershopConfig.name);
    expect(result.address.full).toBe(barbershopConfig.address.full);
    expect(result.social.instagram.main).toBe(
      barbershopConfig.social.instagram.main,
    );
  });

  it("falls back to config when DB lookup fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    asMock(prisma.barbershopSettings.findUnique).mockRejectedValue(
      new Error("DB error"),
    );

    const result = await getBarbershopSettings();

    expect(result.name).toBe(barbershopConfig.name);
    expect(result.address.full).toBe(barbershopConfig.address.full);
    expect(result.contact.phone).toBe(barbershopConfig.contact.phone);
    expect(result.social.instagram.main).toBe(
      barbershopConfig.social.instagram.main,
    );
    expect(result.bookingEnabled).toBe(true);
    expect(result.externalBookingUrl).toBe(
      barbershopConfig.externalBooking.inbarberUrl,
    );
    expect(result.updatedAt).toBeNull();

    consoleSpy.mockRestore();
  });
});
