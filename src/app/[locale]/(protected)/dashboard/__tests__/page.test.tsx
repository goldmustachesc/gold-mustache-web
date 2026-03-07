import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import DashboardPage from "../page";

const mockUseUser = vi.hoisted(() => vi.fn());
const mockUseBarberProfile = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "pt-BR" }),
  usePathname: () => "/pt-BR/dashboard",
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mockUseUser(),
  useSignOut: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useBarberProfile", () => ({
  useBarberProfile: () => mockUseBarberProfile(),
}));

vi.mock("@/components/dashboard/BarberDashboard", () => ({
  BarberDashboard: ({ locale }: { locale: string }) => (
    <div data-testid="barber-dashboard">BarberDashboard:{locale}</div>
  ),
}));

vi.mock("@/components/dashboard/ClientDashboard", () => ({
  ClientDashboard: ({ locale }: { locale: string }) => (
    <div data-testid="client-dashboard">ClientDashboard:{locale}</div>
  ),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({ data: null, isLoading: false });
    mockUseBarberProfile.mockReturnValue({ data: null, isLoading: false });
  });

  it("shows loading spinner while user data is loading", () => {
    mockUseUser.mockReturnValue({ data: null, isLoading: true });
    mockUseBarberProfile.mockReturnValue({ data: null, isLoading: true });
    render(<DashboardPage />);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("renders BarberDashboard when user has barber profile", () => {
    mockUseUser.mockReturnValue({
      data: { id: "u1", email: "barber@test.com" },
      isLoading: false,
    });
    mockUseBarberProfile.mockReturnValue({
      data: { id: "b1", name: "Carlos" },
      isLoading: false,
    });
    render(<DashboardPage />);
    expect(screen.getByTestId("barber-dashboard")).toBeInTheDocument();
    expect(screen.getByText("BarberDashboard:pt-BR")).toBeInTheDocument();
  });

  it("renders ClientDashboard when user has no barber profile", () => {
    mockUseUser.mockReturnValue({
      data: { id: "u1", email: "client@test.com" },
      isLoading: false,
    });
    mockUseBarberProfile.mockReturnValue({ data: null, isLoading: false });
    render(<DashboardPage />);
    expect(screen.getByTestId("client-dashboard")).toBeInTheDocument();
    expect(screen.getByText("ClientDashboard:pt-BR")).toBeInTheDocument();
  });

  it("does not render BarberDashboard for non-barber users", () => {
    mockUseUser.mockReturnValue({
      data: { id: "u1", email: "client@test.com" },
      isLoading: false,
    });
    mockUseBarberProfile.mockReturnValue({ data: null, isLoading: false });
    render(<DashboardPage />);
    expect(screen.queryByTestId("barber-dashboard")).not.toBeInTheDocument();
  });

  it("shows loading while barber profile is loading", () => {
    mockUseUser.mockReturnValue({
      data: { id: "u1" },
      isLoading: false,
    });
    mockUseBarberProfile.mockReturnValue({ data: null, isLoading: true });
    render(<DashboardPage />);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });
});
