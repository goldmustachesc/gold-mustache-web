import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClientDashboard } from "../ClientDashboard";
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

vi.mock("@/components/notifications", () => ({
  NotificationPanel: () => <div data-testid="notification-panel" />,
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    <img {...props} src={props.src as string} alt={props.alt as string} />
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

describe("ClientDashboard", () => {
  beforeEach(() => {
    setupMocks();
  });

  it("renders greeting with first name", () => {
    render(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText(/João/)).toBeInTheDocument();
  });

  it("renders welcome subtitle", () => {
    render(<ClientDashboard locale="pt-BR" />);
    expect(
      screen.getByText(
        "Bem-vindo de volta! Confira seus agendamentos e novidades.",
      ),
    ).toBeInTheDocument();
  });

  it("renders next appointment card when appointment exists", () => {
    render(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();
  });

  it("renders quick action links", () => {
    render(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Acesso rápido")).toBeInTheDocument();
    expect(screen.getByText("Meu Perfil")).toBeInTheDocument();
  });

  it("renders booking quick action", () => {
    render(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Marque um novo horário")).toBeInTheDocument();
  });

  it("shows loading state when stats are loading", () => {
    setupMocks({ statsLoading: true });
    render(<ClientDashboard locale="pt-BR" />);
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
    render(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByText("Visão Geral da Barbearia")).toBeInTheDocument();
    expect(screen.getByText("Administração")).toBeInTheDocument();
  });

  it("does not render admin section for regular clients", () => {
    render(<ClientDashboard locale="pt-BR" />);
    expect(
      screen.queryByText("Visão Geral da Barbearia"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Administração")).not.toBeInTheDocument();
  });

  it("renders header with logo and menu button", () => {
    render(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByAltText("Gold Mustache")).toBeInTheDocument();
  });

  it("renders notification panel when user exists", () => {
    render(<ClientDashboard locale="pt-BR" />);
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
  });

  it("renders with correct locale in links", () => {
    render(<ClientDashboard locale="en" />);
    const profileLink = screen.getByText("Meu Perfil").closest("a");
    expect(profileLink).toHaveAttribute("href", "/en/profile");
  });
});
