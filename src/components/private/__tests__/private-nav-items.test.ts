import { describe, it, expect } from "vitest";
import {
  getNavItems,
  getAdminNavItems,
  resolvePrimaryNavRole,
  type NavItemDef,
} from "../private-nav-items";

const LOCALE = "pt-BR";

describe("private-nav-items", () => {
  describe("getNavItems", () => {
    it("returns barber nav items with correct hrefs", () => {
      const items = getNavItems("BARBER", LOCALE);

      expect(items.length).toBeGreaterThanOrEqual(8);
      expect(items[0].href).toBe(`/${LOCALE}/dashboard`);
      expect(items[0].label).toBe("Início");

      expect(items.find((i) => i.label === "Minha Agenda")).toBeUndefined();
    });

    it("returns client nav items with correct hrefs", () => {
      const items = getNavItems("CLIENT", LOCALE);

      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items[0].href).toBe(`/${LOCALE}/dashboard`);
      expect(items[0].label).toBe("Início");

      const loyaltyItem = items.find((i) => i.label === "Fidelidade");
      expect(loyaltyItem?.href).toBe(`/${LOCALE}/loyalty`);
    });

    it("barber items include profile", () => {
      const items = getNavItems("BARBER", LOCALE);
      const profileItem = items.find((i) => i.label === "Meu Perfil");
      expect(profileItem).toBeDefined();
      expect(profileItem?.href).toBe(`/${LOCALE}/profile`);
    });

    it("client items include profile", () => {
      const items = getNavItems("CLIENT", LOCALE);
      const profileItem = items.find((i) => i.label === "Meu Perfil");
      expect(profileItem).toBeDefined();
    });

    it("every item has an iconName, href, and label", () => {
      for (const role of ["BARBER", "CLIENT", "ADMIN"] as const) {
        const items = getNavItems(role, LOCALE);
        for (const item of items) {
          expect(item.iconName).toBeTruthy();
          expect(item.href).toMatch(/^\//);
          expect(item.label).toBeTruthy();
        }
      }
    });

    it("ADMIN role home points to dashboard, not barber page", () => {
      const adminItems = getNavItems("ADMIN", LOCALE);
      expect(adminItems[0].href).toBe(`/${LOCALE}/dashboard`);
      expect(adminItems[0].label).toBe("Início");
    });

    it("ADMIN role does not include barber home route", () => {
      const adminItems = getNavItems("ADMIN", LOCALE);
      const barberHome = adminItems.find(
        (i) => i.href === `/${LOCALE}/barbeiro`,
      );
      expect(barberHome).toBeUndefined();
    });

    it("includes loyalty for CLIENT when flags not provided (backwards compatible)", () => {
      const items = getNavItems("CLIENT", LOCALE);
      const loyaltyItem = items.find((i) => i.label === "Fidelidade");
      expect(loyaltyItem).toBeDefined();
    });

    it("includes loyalty for CLIENT when loyaltyProgram is true", () => {
      const items = getNavItems("CLIENT", LOCALE, { loyaltyProgram: true });
      const loyaltyItem = items.find((i) => i.label === "Fidelidade");
      expect(loyaltyItem).toBeDefined();
    });

    it("excludes loyalty for CLIENT when loyaltyProgram is false", () => {
      const items = getNavItems("CLIENT", LOCALE, { loyaltyProgram: false });
      const loyaltyItem = items.find((i) => i.label === "Fidelidade");
      expect(loyaltyItem).toBeUndefined();
    });

    it("does not exclude loyalty for BARBER even when loyaltyProgram is false", () => {
      const items = getNavItems("BARBER", LOCALE, { loyaltyProgram: false });
      expect(items[0].href).toBe(`/${LOCALE}/dashboard`);
    });
  });

  describe("getAdminNavItems", () => {
    it("returns admin section items", () => {
      const items = getAdminNavItems(LOCALE);
      expect(items.length).toBeGreaterThanOrEqual(5);

      const labels = items.map((i: NavItemDef) => i.label);
      expect(labels).toContain("Dados da Barbearia");
      expect(labels).toContain("Feature flags");
      expect(labels).toContain("Serviços");
      expect(labels).toContain("Gerenciar Barbeiros");
      expect(labels).toContain("Auditoria");
    });

    it("every item has correct structure", () => {
      const items = getAdminNavItems(LOCALE);
      for (const item of items) {
        expect(item.iconName).toBeTruthy();
        expect(item.href).toMatch(/^\//);
        expect(item.label).toBeTruthy();
      }
    });
  });

  describe("resolvePrimaryNavRole", () => {
    it("prioriza a navegação de barbeiro no dashboard quando ADMIN também tem barberProfile", () => {
      expect(
        resolvePrimaryNavRole({
          role: "ADMIN",
          locale: LOCALE,
          pathname: `/${LOCALE}/dashboard`,
          hasBarberProfile: true,
        }),
      ).toBe("BARBER");
    });

    it("prioriza a navegação de barbeiro em rotas /barbeiro quando ADMIN também tem barberProfile", () => {
      expect(
        resolvePrimaryNavRole({
          role: "ADMIN",
          locale: LOCALE,
          pathname: `/${LOCALE}/barbeiro/clientes`,
          hasBarberProfile: true,
        }),
      ).toBe("BARBER");
    });

    it("mantém a navegação de admin fora do contexto de barbeiro", () => {
      expect(
        resolvePrimaryNavRole({
          role: "ADMIN",
          locale: LOCALE,
          pathname: `/${LOCALE}/admin/barbeiros`,
          hasBarberProfile: true,
        }),
      ).toBe("ADMIN");
    });
  });
});
