import { describe, it, expect } from "vitest";
import {
  getNavItems,
  getAdminNavItems,
  type NavItemDef,
} from "../private-nav-items";

const LOCALE = "pt-BR";

describe("private-nav-items", () => {
  describe("getNavItems", () => {
    it("returns barber nav items with correct hrefs", () => {
      const items = getNavItems("BARBER", LOCALE);

      expect(items.length).toBeGreaterThanOrEqual(8);
      expect(items[0].href).toBe(`/${LOCALE}/barbeiro`);
      expect(items[0].label).toBe("Início");

      const scheduleItem = items.find((i) => i.label === "Minha Agenda");
      expect(scheduleItem?.href).toBe(`/${LOCALE}/dashboard`);
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
      for (const role of ["BARBER", "CLIENT"] as const) {
        const items = getNavItems(role, LOCALE);
        for (const item of items) {
          expect(item.iconName).toBeTruthy();
          expect(item.href).toMatch(/^\//);
          expect(item.label).toBeTruthy();
        }
      }
    });

    it("ADMIN role gets barber-level items", () => {
      const adminItems = getNavItems("ADMIN", LOCALE);
      const barberItems = getNavItems("BARBER", LOCALE);
      expect(adminItems).toEqual(barberItems);
    });
  });

  describe("getAdminNavItems", () => {
    it("returns admin section items", () => {
      const items = getAdminNavItems(LOCALE);
      expect(items.length).toBeGreaterThanOrEqual(5);

      const labels = items.map((i: NavItemDef) => i.label);
      expect(labels).toContain("Dados da Barbearia");
      expect(labels).toContain("Serviços");
      expect(labels).toContain("Gerenciar Barbeiros");
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
});
