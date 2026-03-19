import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../dropdown-menu";

describe("Dropdown menu (Radix wrapper)", () => {
  it("abre e aciona item do menu", async () => {
    const user = userEvent.setup();
    const onItem = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button">Abrir</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onItem}>Ação</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(await screen.findByRole("menuitem", { name: "Ação" }));

    expect(onItem).toHaveBeenCalled();
  });

  it("alterna checkbox e respeita separador", async () => {
    const user = userEvent.setup();

    function Host() {
      const [checked, setChecked] = useState(false);

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button">Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={checked}
              onCheckedChange={setChecked}
            >
              Lembrar
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Outro</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    render(<Host />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    const checkbox = await screen.findByRole("menuitemcheckbox", {
      name: "Lembrar",
    });
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("seleciona opção em grupo radio", async () => {
    const user = userEvent.setup();

    function Host() {
      const [value, setValue] = useState("a");

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button">Pick</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
              <DropdownMenuRadioItem value="a">Alpha</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="b">Bravo</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    render(<Host />);

    await user.click(screen.getByRole("button", { name: "Pick" }));

    const bravo = await screen.findByRole("menuitemradio", { name: "Bravo" });
    await user.click(bravo);

    expect(bravo).toHaveAttribute("aria-checked", "true");
  });

  it("abre submenu e seleciona item interno", async () => {
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button">Principal</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Mais</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Interno</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByRole("button", { name: "Principal" }));
    await user.click(await screen.findByRole("menuitem", { name: "Mais" }));

    await user.click(await screen.findByRole("menuitem", { name: "Interno" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("menuitem", { name: "Interno" }),
      ).not.toBeInTheDocument();
    });
  });
});
