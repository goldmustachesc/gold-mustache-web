import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNavOverlay } from "../MobileNavOverlay";

const mockUseUser = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mockUseUser(),
  useSignOut: () => ({ mutate: mockSignOut, isPending: false }),
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => ({
    bookingHref: "/pt-BR/agendar",
    shouldShowBooking: true,
    isExternal: false,
  }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
  useTranslations: (ns: string) => {
    const keys: Record<string, Record<string, string>> = {
      navigation: {
        login: "Entrar",
        account: "Conta",
      },
      common: {
        "buttons.bookAppointment": "Agendar Horário",
        "buttons.signOut": "Sair",
        "buttons.signingOut": "Saindo...",
        "aria.openMenu": "Abrir menu",
        "aria.closeMenu": "Fechar menu",
      },
    };
    return (key: string) => keys[ns]?.[key] ?? key;
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

vi.mock("next/image", () => ({
  default: function MockImage({ src, alt }: { src?: string; alt?: string }) {
    // biome-ignore lint/performance/noImgElement: test mock for next/image
    return <img src={src ?? ""} alt={alt ?? ""} />;
  },
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("@/components/ui/language-switcher", () => ({
  LanguageSwitcher: ({ variant }: { variant: string }) => (
    <div data-testid="language-switcher" data-variant={variant}>
      LanguageSwitcher
    </div>
  ),
}));

const defaultNavLinks = [
  { href: "/pt-BR", label: "Início" },
  { href: "/pt-BR#servicos", label: "Serviços" },
  { href: "/pt-BR#equipe", label: "Equipe" },
  { href: "/pt-BR/blog", label: "Blog" },
  { href: "/pt-BR#eventos", label: "Eventos" },
  { href: "/pt-BR#contato", label: "Contato" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUser.mockReturnValue({ data: null });
});

describe("MobileNavOverlay", () => {
  it("does not render content when closed", () => {
    render(
      <MobileNavOverlay
        isOpen={false}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );
    expect(screen.queryByText("Início")).not.toBeInTheDocument();
  });

  it("renders all navigation links when open", () => {
    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );

    for (const { label } of defaultNavLinks) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders brand logo when open", () => {
    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );
    expect(screen.getByText("Gold Mustache")).toBeInTheDocument();
  });

  it("renders close button that calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={onClose}
        navLinks={defaultNavLinks}
      />,
    );

    const closeButton = screen.getByRole("button", { name: "Fechar menu" });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders theme toggle and language switcher", () => {
    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders booking CTA when booking is enabled", () => {
    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );
    const bookingLink = screen.getByRole("link", {
      name: /Agendar Horário/,
    });
    expect(bookingLink).toHaveAttribute("href", "/pt-BR/agendar");
  });

  it("shows login link when user is not authenticated", () => {
    mockUseUser.mockReturnValue({ data: null });
    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );
    const loginLink = screen.getByRole("link", { name: /Entrar/ });
    expect(loginLink).toHaveAttribute("href", "/pt-BR/login");
  });

  it("shows account link when user is authenticated", () => {
    mockUseUser.mockReturnValue({
      data: { id: "1", email: "test@test.com" },
    });
    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );
    const accountLink = screen.getByRole("link", { name: /^Conta$/ });
    expect(accountLink).toHaveAttribute("href", "/pt-BR/dashboard");
  });

  it("calls onClose when a navigation link is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={onClose}
        navLinks={defaultNavLinks}
      />,
    );

    await user.click(screen.getByText("Serviços"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("has role=dialog and aria-modal=true when open", () => {
    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("calls onClose when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MobileNavOverlay
        isOpen={true}
        onClose={onClose}
        navLinks={defaultNavLinks}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("locks body scroll when open", () => {
    const { unmount } = render(
      <MobileNavOverlay
        isOpen={true}
        onClose={vi.fn()}
        navLinks={defaultNavLinks}
      />,
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
