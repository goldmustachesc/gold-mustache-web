import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../navigation-menu";

describe("Navigation menu (Radix wrapper)", () => {
  it("abre painel e navega para link", async () => {
    const user = userEvent.setup();

    render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Serviços</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/corte">Corte</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    await user.click(screen.getByRole("button", { name: "Serviços" }));

    const link = await screen.findByRole("link", { name: "Corte" });
    expect(link).toHaveAttribute("href", "/corte");
  });

  it("habilita viewport no root quando a prop padrão é usada", () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Item</NavigationMenuTrigger>
            <NavigationMenuContent>C</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const root = container.querySelector('[data-slot="navigation-menu"]');
    expect(root).toHaveAttribute("data-viewport", "true");
  });

  it("expõe navigationMenuTriggerStyle como string de classes", () => {
    expect(typeof navigationMenuTriggerStyle()).toBe("string");
    expect(navigationMenuTriggerStyle()).toContain("inline-flex");
  });
});
