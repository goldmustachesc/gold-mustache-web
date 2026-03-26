import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClientDashboard } from "../ClientDashboard";
import { PrivateHeaderProvider } from "@/components/private/PrivateHeaderContext";
import { PrivateHeader } from "@/components/private/PrivateHeader";
import type {
  DashboardStats,
  ClientStats,
  AdminStats,
} from "@/types/dashboard";

const mockUseUser = vi.hoisted(() => vi.fn());
const mockUseProfileMe = vi.hoisted(() => vi.fn());
const mockUseDashboardStats = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt-BR/dashboard",
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mockUseUser(),
  useSignOut: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => mockUseProfileMe(),
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: () => mockUseDashboardStats(),
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => ({
    bookingHref: "/pt-BR/agendar",
    shouldShowBooking: true,
    isExternal: false,
    isInternal: true,
  }),
}));

const mockFeatureFlags = vi.hoisted(() => ({
  value: {
    loyaltyProgram: true,
    referralProgram: true,
    eventsSection: true,
  },
}));

vi.mock("@/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => mockFeatureFlags.value,
}));

vi.mock("@/components/notifications/NotificationPanel", () => ({
  NotificationPanel: () => <div data-testid="notification-panel" />,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: Record<string, unknown>) => (
    <div role="img" data-testid="next-image" aria-label={alt as string} />
  ),
}));

const clientStats: ClientStats = {
  nextAppointment: {
    id: "apt-1",
    date: "2026-03-10",
    startTime: "09:00",
    endTime: "09:30",
    barber: { id: "b1", name: "Carlos", avatarUrl: null },
    service: { id: "s1", name: "Corte", duration: 30, price: 50 },
  },
  upcomingCount: 1,
  totalVisits: 5,
  totalSpent: 250,
  favoriteBarber: null,
  favoriteService: null,
  lastService: null,
};

const adminStats: AdminStats = {
  todayAppointments: 8,
  todayRevenue: 400,
  weekAppointments: 30,
  weekRevenue: 2000,
  activeBarbers: 3,
  totalClients: 100,
};

function setupMocks(overrides?: {
  user?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
  stats?: Partial<DashboardStats> | null;
  statsLoading?: boolean;
}) {
  mockUseUser.mockReturnValue({
    data: overrides?.user ?? { id: "u1", email: "test@test.com" },
    isLoading: false,
  });
  mockUseProfileMe.mockReturnValue({
    data: overrides?.profile ?? { fullName: "João Silva", role: "CLIENT" },
  });
  mockUseDashboardStats.mockReturnValue({
    data:
      overrides?.stats !== undefined
        ? overrides.stats
        : { role: "CLIENT", client: clientStats, barber: null, admin: null },
    isLoading: overrides?.statsLoading ?? false,
  });
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<PrivateHeaderProvider>{ui}</PrivateHeaderProvider>);
}

describe("ClientDashboard", () => {
  beforeEach(() => {
    setupMocks();
    mockFeatureFlags.value = {
      loyaltyProgram: true,
      referralProgram: true,
      eventsSection: true,
    };
  });

  it("renders greeting with first name", () => {
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText(/João/)).toBeInTheDocument();
  });

  it("renders welcome subtitle", () => {
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(
      screen.getByText(
        "Bem-vindo de volta! Confira seus agendamentos e novidades.",
      ),
    ).toBeInTheDocument();
  });

  it("renders next appointment card when appointment exists", () => {
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();
  });

  it("renders quick action links", () => {
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Acesso rápido")).toBeInTheDocument();
    expect(screen.getByText("Meu Perfil")).toBeInTheDocument();
  });

  it("renders booking quick action", () => {
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Marque um novo horário")).toBeInTheDocument();
  });

  it("hides loyalty quick action when loyaltyProgram flag is false", () => {
    mockFeatureFlags.value = {
      loyaltyProgram: false,
      referralProgram: true,
      eventsSection: true,
    };

    renderWithProvider(<ClientDashboard locale="pt-BR" />);

    expect(screen.queryByText("Fidelidade")).not.toBeInTheDocument();
    expect(screen.getByText("Meu Perfil")).toBeInTheDocument();
  });

  it("provides an accessible name for the header booking action", () => {
    renderWithProvider(
      <>
        <PrivateHeader />
        <ClientDashboard locale="pt-BR" />
      </>,
    );

    return waitFor(() => {
      const bookingLink = screen.getByRole("link", { name: "Agendar" });
      expect(bookingLink).toHaveAttribute("aria-label", "Agendar");
    });
  });

  it("shows loading state when stats are loading", () => {
    setupMocks({ statsLoading: true });
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Carregando informações...")).toBeInTheDocument();
  });

  it("renders admin section when user is admin", () => {
    setupMocks({
      profile: { fullName: "Admin User", role: "ADMIN" },
      stats: {
        role: "ADMIN",
        client: clientStats,
        barber: null,
        admin: adminStats,
      },
    });
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Visão Geral da Barbearia")).toBeInTheDocument();
    expect(screen.getByText("Administração")).toBeInTheDocument();
  });

  it("does not render admin section for regular clients", () => {
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(
      screen.queryByText("Visão Geral da Barbearia"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Administração")).not.toBeInTheDocument();
  });

  it("sets page title via usePrivateHeader", () => {
    renderWithProvider(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Acesso rápido")).toBeInTheDocument();
  });

  it("renders with correct locale in links", () => {
    renderWithProvider(<ClientDashboard locale="en" />);
    const profileLink = screen.getByText("Meu Perfil").closest("a");
    expect(profileLink).toHaveAttribute("href", "/en/profile");
  });
});
