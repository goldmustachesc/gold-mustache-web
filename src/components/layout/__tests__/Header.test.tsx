import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "../Header";

const mockUseUser = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mockUseUser(),
}));

const mockBookingSettings = vi.hoisted(() =>
  vi.fn(() => ({
    bookingHref: "/pt-BR/agendar",
    shouldShowBooking: true,
    isExternal: false,
    isInternal: true,
    isDisabled: false,
  })),
);

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => mockBookingSettings(),
}));

const mockScrollPosition = vi.hoisted(() =>
  vi.fn(() => ({
    scrollY: 0,
    isScrolledPastThreshold: false,
  })),
);

vi.mock("@/hooks/useScrollPosition", () => ({
  useScrollPosition: () => mockScrollPosition(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
  useTranslations: (ns: string) => {
    const keys: Record<string, Record<string, string>> = {
      navigation: {
        home: "Início",
        services: "Serviços",
        team: "Equipe",
        blog: "Blog",
        events: "Eventos",
        contact: "Contato",
        myAppointments: "Meus agendamentos",
        login: "Entrar",
        account: "Conta",
      },
      common: {
        "buttons.book": "Agendar",
        "aria.openMenu": "Abrir menu",
        "aria.closeMenu": "Fechar menu",
      },
    };
    return (key: string) => keys[ns]?.[key] ?? key;
  },
}));

vi.mock("next/image", () => ({
  default: function MockImage({ src, alt }: { src?: string; alt?: string }) {
    // biome-ignore lint/performance/noImgElement: test mock for next/image
    return <img src={src ?? ""} alt={alt ?? ""} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("@/components/ui/language-switcher", () => ({
  LanguageSwitcher: () => (
    <div data-testid="language-switcher">LanguageSwitcher</div>
  ),
}));

vi.mock("../MobileNavOverlay", () => ({
  MobileNavOverlay: ({
    isOpen,
    onClose,
    navLinks,
  }: {
    isOpen: boolean;
    onClose: () => void;
    navLinks: { href: string; label: string }[];
  }) =>
    isOpen ? (
      <div data-testid="mobile-nav-overlay">
        <ul>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUser.mockReturnValue({ data: null });
  mockScrollPosition.mockReturnValue({
    scrollY: 0,
    isScrolledPastThreshold: false,
  });
  mockBookingSettings.mockReturnValue({
    bookingHref: "/pt-BR/agendar",
    shouldShowBooking: true,
    isExternal: false,
    isInternal: true,
    isDisabled: false,
  });
});

describe("Header", () => {
  it("renders the gold accent line as signature element", () => {
    const { container } = render(<Header />);
    const accentLine = container.querySelector("[data-accent-line]");
    expect(accentLine).toBeInTheDocument();
  });

  it("renders the logo with brand name", () => {
    render(<Header />);
    expect(screen.getByText("Gold Mustache")).toBeInTheDocument();
    expect(screen.getByAltText("Gold Mustache Logo")).toBeInTheDocument();
  });

  it("renders all navigation links with correct hrefs", () => {
    render(<Header />);
    const expectedLinks = [
      { label: "Início", href: "/pt-BR" },
      { label: "Serviços", href: "/pt-BR#servicos" },
      { label: "Equipe", href: "/pt-BR#equipe" },
      { label: "Blog", href: "/pt-BR/blog" },
      { label: "Eventos", href: "/pt-BR#eventos" },
      { label: "Contato", href: "/pt-BR#contato" },
      { label: "Meus agendamentos", href: "/pt-BR/meus-agendamentos" },
    ];

    for (const { label, href } of expectedLinks) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("renders booking CTA when booking is enabled and not scrolled", () => {
    render(<Header />);
    const bookingLink = screen.getByRole("link", { name: "Agendar" });
    expect(bookingLink).toBeInTheDocument();
    expect(bookingLink).toHaveAttribute("href", "/pt-BR/agendar");
  });

  it("hides booking CTA when scrolled past threshold", () => {
    mockScrollPosition.mockReturnValue({
      scrollY: 400,
      isScrolledPastThreshold: true,
    });

    render(<Header />);
    expect(
      screen.queryByRole("link", { name: "Agendar" }),
    ).not.toBeInTheDocument();
  });

  it("hides booking CTA when booking is disabled", () => {
    mockBookingSettings.mockReturnValue({
      bookingHref: null,
      shouldShowBooking: false,
      isExternal: false,
      isInternal: false,
      isDisabled: true,
    });

    render(<Header />);
    expect(
      screen.queryByRole("link", { name: "Agendar" }),
    ).not.toBeInTheDocument();
  });

  it("shows login link when user is not authenticated", () => {
    mockUseUser.mockReturnValue({ data: null });
    render(<Header />);
    const loginLink = screen.getByRole("link", { name: "Entrar" });
    expect(loginLink).toHaveAttribute("href", "/pt-BR/login");
  });

  it("shows account link when user is authenticated", () => {
    mockUseUser.mockReturnValue({ data: { id: "1", email: "test@test.com" } });
    render(<Header />);
    const accountLink = screen.getByRole("link", { name: "Conta" });
    expect(accountLink).toHaveAttribute("href", "/pt-BR/dashboard");
  });

  it("renders theme toggle and language switcher", () => {
    render(<Header />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders mobile menu button", () => {
    render(<Header />);
    const menuButton = screen.getByRole("button", { name: "Abrir menu" });
    expect(menuButton).toBeInTheDocument();
  });

  it("opens mobile nav overlay when menu button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    expect(screen.queryByTestId("mobile-nav-overlay")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));

    const overlay = screen.getByTestId("mobile-nav-overlay");
    expect(overlay).toBeInTheDocument();
    expect(
      within(overlay).getByRole("link", { name: "Meus agendamentos" }),
    ).toHaveAttribute("href", "/pt-BR/meus-agendamentos");
  });

  it("hides the my appointments link when internal booking is unavailable", () => {
    mockBookingSettings.mockReturnValue({
      bookingHref: "https://external-booking.com",
      shouldShowBooking: true,
      isExternal: true,
      isInternal: false,
      isDisabled: false,
    });

    render(<Header />);

    expect(
      screen.queryByRole("link", { name: "Meus agendamentos" }),
    ).not.toBeInTheDocument();
  });

  it("renders logo linking to home page", () => {
    render(<Header />);
    const logoLink = screen.getByRole("link", { name: /Gold Mustache/ });
    expect(logoLink).toHaveAttribute("href", "/pt-BR");
  });

  it("adds external link props for external booking", () => {
    mockBookingSettings.mockReturnValue({
      bookingHref: "https://external-booking.com",
      shouldShowBooking: true,
      isExternal: true,
      isInternal: false,
      isDisabled: false,
    });

    render(<Header />);
    const bookingLink = screen.getByRole("link", { name: "Agendar" });
    expect(bookingLink).toHaveAttribute("target", "_blank");
    expect(bookingLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
