import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "../language-switcher";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: "/pt-BR/agenda",
  locale: "pt-BR" as const,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => mocks.pathname,
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    mocks.push.mockClear();
    mocks.pathname = "/pt-BR/agenda";
    mocks.locale = "pt-BR";
    localStorage.clear();
  });

  it("mostra skeleton antes do mount e o botão após montar (desktop)", async () => {
    const { container } = render(<LanguageSwitcher variant="desktop" />);

    expect(container.querySelector("svg")).toBeTruthy();

    expect(
      await screen.findByRole("button", { name: /change language/i }),
    ).toBeInTheDocument();
  });

  it("abre o menu, troca de locale e persiste em localStorage", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher variant="desktop" />);

    const trigger = await screen.findByRole("button", {
      name: /change language/i,
    });
    await user.click(trigger);

    const english = await screen.findByRole("menuitem", { name: /english/i });
    await user.click(english);

    expect(localStorage.getItem("preferred-locale")).toBe("en");
    expect(mocks.push).toHaveBeenCalledWith("/en/agenda");
  });

  it("não navega quando o locale selecionado já é o atual", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher variant="desktop" />);

    const trigger = await screen.findByRole("button", {
      name: /change language/i,
    });
    await user.click(trigger);

    const portugues = await screen.findByRole("menuitem", {
      name: /português/i,
    });
    await user.click(portugues);

    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("fecha ao clicar fora do dropdown", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LanguageSwitcher variant="desktop" />
        <button type="button">fora</button>
      </div>,
    );

    const trigger = await screen.findByRole("button", {
      name: /change language/i,
    });
    await user.click(trigger);

    await screen.findByRole("menu");

    await user.click(screen.getByRole("button", { name: "fora" }));

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("fecha ao pressionar Escape", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher variant="desktop" />);

    const trigger = await screen.findByRole("button", {
      name: /change language/i,
    });
    await user.click(trigger);

    await screen.findByRole("menu");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("registra warn quando localStorage falha (sem lançar)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const user = userEvent.setup();
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    render(<LanguageSwitcher variant="desktop" />);

    const trigger = await screen.findByRole("button", {
      name: /change language/i,
    });
    await user.click(trigger);

    const english = await screen.findByRole("menuitem", { name: /english/i });
    await user.click(english);

    expect(warnSpy).toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith("/en/agenda");
  });

  it("renderiza variante mobile com menu expansível", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher variant="mobile" />);

    const trigger = await screen.findByRole("button", {
      name: /change language/i,
    });
    await user.click(trigger);

    const menu = await screen.findByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.some((el) => /português/i.test(el.textContent ?? ""))).toBe(
      true,
    );
  });
});
