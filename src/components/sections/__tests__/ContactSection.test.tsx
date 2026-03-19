import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactSection } from "../ContactSection";

const mocks = vi.hoisted(() => ({
  useBookingSettings: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    target?: string;
    rel?: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => mocks.useBookingSettings(),
}));

vi.mock("@/components/custom/GoogleMap", () => ({
  GoogleMap: () => <div>google-map</div>,
}));

vi.mock("@/components/shared/RevealOnScroll", () => ({
  RevealOnScroll: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/shared/SectionLayout", () => ({
  SectionLayout: ({
    children,
    title,
    description,
    badge,
  }: {
    children: ReactNode;
    title: string;
    description: string;
    badge: string;
  }) => (
    <section>
      <h2>{badge}</h2>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

describe("ContactSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useBookingSettings.mockReturnValue({
      bookingHref: "/agendar",
      shouldShowBooking: true,
      isExternal: false,
    });
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("renderiza mapa, links sociais e CTA de agendamento", () => {
    render(<ContactSection />);

    expect(screen.getByText("google-map")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /contact.cta.book/i }),
    ).toHaveAttribute("href", "/agendar");
    expect(
      screen.getByRole("link", { name: /@goldmustachebarbearia/i }),
    ).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /@_goldlab/i })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("abre google maps ao clicar no botão de navegação", () => {
    render(<ContactSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /contact.address.cta/i }),
    );

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("google"),
      "_blank",
    );
  });

  it("abre whatsapp do contato selecionado", () => {
    render(<ContactSection />);

    const whatsappButtons = screen.getAllByRole("button", {
      name: /contact.phone.cta/i,
    });
    fireEvent.click(whatsappButtons[0]);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/"),
      "_blank",
    );
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("contact.whatsappMessage")),
      "_blank",
    );
  });

  it("omite CTA de agendamento quando configuração desabilita booking", () => {
    mocks.useBookingSettings.mockReturnValue({
      bookingHref: null,
      shouldShowBooking: false,
      isExternal: false,
    });

    render(<ContactSection />);

    expect(
      screen.queryByRole("link", { name: /contact.cta.book/i }),
    ).not.toBeInTheDocument();
  });
});
