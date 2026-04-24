import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingBookingButton } from "../floating-booking-button";

const scrollMocks = vi.hoisted(() => ({
  isScrolledPastThreshold: true,
}));

const bookingMocks = vi.hoisted(() => ({
  bookingHref: "https://ext.example/book",
  shouldShowBooking: true,
  isExternal: true,
}));

const trackBookingClick = vi.hoisted(() => vi.fn());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      schedule: "Agendar",
      scheduleAtBarbershop: "Agendar horário na barbearia",
    };
    return messages[key] ?? key;
  },
}));

vi.mock("@/hooks/useScrollPosition", () => ({
  useScrollPosition: () => ({
    isScrolledPastThreshold: scrollMocks.isScrolledPastThreshold,
  }),
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => ({
    bookingHref: bookingMocks.bookingHref,
    shouldShowBooking: bookingMocks.shouldShowBooking,
    isExternal: bookingMocks.isExternal,
  }),
}));

vi.mock("@/components/analytics/GoogleAnalytics", () => ({
  trackBookingClick: () => trackBookingClick(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    target?: string;
    rel?: string;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("FloatingBookingButton", () => {
  beforeEach(() => {
    scrollMocks.isScrolledPastThreshold = true;
    bookingMocks.bookingHref = "/pt-BR/agendar";
    bookingMocks.shouldShowBooking = true;
    bookingMocks.isExternal = false;
    trackBookingClick.mockClear();
  });

  it("renderiza link interno e rastreia clique", async () => {
    const user = userEvent.setup();
    render(<FloatingBookingButton />);

    const link = screen.getByRole("link", { name: /agendar horário/i });
    expect(link).toHaveAttribute("href", "/pt-BR/agendar");
    await user.click(link);
    expect(trackBookingClick).toHaveBeenCalled();
  });

  it("abre em nova aba quando booking é externo", () => {
    bookingMocks.isExternal = true;
    bookingMocks.bookingHref = "https://book.example";

    render(<FloatingBookingButton />);

    const link = screen.getByRole("link", { name: /agendar horário/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("retorna null quando não deve exibir", () => {
    bookingMocks.shouldShowBooking = false;

    const { container } = render(<FloatingBookingButton />);

    expect(container.firstChild).toBeNull();
  });
});
