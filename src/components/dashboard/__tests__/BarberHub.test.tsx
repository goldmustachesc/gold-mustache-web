import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { BarberHub } from "../BarberHub";
import { PrivateHeaderProvider } from "@/components/private/PrivateHeaderContext";
import { PrivateHeader } from "@/components/private/PrivateHeader";

vi.mock("@/hooks/useBarberProfile", () => ({
  useBarberProfile: () => ({
    data: { id: "barber-1", name: "Carlos Silva" },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: () => ({
    data: {
      role: "BARBER",
      client: null,
      admin: null,
      barber: {
        todayAppointments: 2,
        todayEarnings: 120,
        weekAppointments: 10,
        weekEarnings: 500,
        nextClient: null,
      },
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ data: { id: "user-1", email: "barber@test.com" } }),
}));

vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => ({ data: { role: "BARBER", fullName: "Carlos Silva" } }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: Record<string, unknown>) => (
    <div role="img" data-testid="next-image" aria-label={alt as string} />
  ),
}));

vi.mock("@/components/notifications/NotificationPanel", () => ({
  NotificationPanel: () => <div data-testid="notification-panel" />,
}));

vi.mock("../BarberStatsCards", () => ({
  BarberStatsCards: () => <div data-testid="barber-stats-cards" />,
}));

vi.mock("../QuickAction", () => ({
  QuickAction: ({ label }: { label: string }) => <div>{label}</div>,
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(<PrivateHeaderProvider>{ui}</PrivateHeaderProvider>);
}

describe("BarberHub", () => {
  it("provides an accessible name for the header booking action", () => {
    renderWithProvider(
      <>
        <PrivateHeader />
        <BarberHub locale="pt-BR" />
      </>,
    );

    return waitFor(() => {
      const bookingLink = screen.getByRole("link", {
        name: "Agendar para Cliente",
      });
      expect(bookingLink).toHaveAttribute("aria-label", "Agendar para Cliente");
      expect(bookingLink).toHaveAttribute("href", "/pt-BR/barbeiro/agendar");
    });
  });
});
