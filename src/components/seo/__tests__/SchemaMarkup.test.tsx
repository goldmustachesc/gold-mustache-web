import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchemaMarkup } from "../SchemaMarkup";

const mocks = vi.hoisted(() => ({
  getServices: vi.fn(),
  siteConfig: {
    isProduction: true,
    productionUrl: "https://goldmustache.com.br",
  },
}));

vi.mock("@/config/site", () => ({
  siteConfig: mocks.siteConfig,
}));

vi.mock("@/config/barbershop", () => ({
  barbershopConfig: {
    name: "Gold Mustache",
    shortName: "GM",
    description: "Barbearia premium",
    tagline: "Cortes com estilo",
    foundingYear: 2020,
    address: {
      street: "Rua Principal",
      number: "123",
      neighborhood: "Centro",
      city: "Itapema",
      state: "SC",
      zipCode: "88220-000",
      country: "BR",
    },
    coordinates: {
      lat: -27.1,
      lng: -48.6,
    },
    contact: {
      phone: "47999999999",
    },
    barberContacts: {
      vitor: { phone: "47111111111" },
      joao: { phone: "47222222222" },
      david: { phone: "47333333333" },
    },
    social: {
      instagram: {
        mainUrl: "https://instagram.com/gold",
        storeUrl: "https://instagram.com/goldlab",
      },
    },
    defaultHours: {
      weekdays: { open: "09:00", close: "19:00" },
      saturday: { open: "09:00", close: "16:00" },
    },
  },
}));

vi.mock("@/services/booking", () => ({
  getServices: () => mocks.getServices(),
}));

describe("SchemaMarkup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.siteConfig.isProduction = true;
  });

  it("não renderiza scripts fora de produção", async () => {
    mocks.siteConfig.isProduction = false;

    const result = await SchemaMarkup();

    expect(result).toBeNull();
  });

  it("renderiza schemas com catálogo de serviços quando existem serviços", async () => {
    mocks.getServices.mockResolvedValue([
      {
        name: "Corte Americano",
        description: "Descrição do corte",
        price: 45,
        slug: "corte-americano",
      },
    ]);

    render(await SchemaMarkup());

    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );

    expect(scripts).toHaveLength(6);
    expect(document.body.innerHTML).toContain("LocalBusiness");
    expect(document.body.innerHTML).toContain("OfferCatalog");
    expect(document.body.innerHTML).toContain("Corte Americano");
    expect(document.body.innerHTML).toContain(
      "https://goldmustache.com.br/#servico-corte-americano",
    );
  });

  it("mantém schema base e ignora falha ao buscar serviços", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getServices.mockRejectedValue(new Error("db off"));

    render(await SchemaMarkup());

    expect(document.body.innerHTML).toContain("Serviços de Barbearia");
    expect(document.body.innerHTML).not.toContain("OfferCatalog");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching services for schema markup:",
      expect.any(Error),
    );
  });
});
