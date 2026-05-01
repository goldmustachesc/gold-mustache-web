import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MeusAgendamentosClient } from "../MeusAgendamentosClient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockUseUser = vi.fn();
const mockUseClientAppointments = vi.fn();
const mockUseDashboardStats = vi.fn();
const mockUseCancelAppointment = vi.fn();
const mockUseCreateFeedback = vi.fn();
const mockUseClaimGuestAppointments = vi.fn();
const mockHasGuestToken = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mockUseUser(),
  useSignOut: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useBooking", () => ({
  useClientAppointments: (...args: unknown[]) =>
    mockUseClientAppointments(...args),
  useCancelAppointment: () => mockUseCancelAppointment(),
  useClaimGuestAppointments: () => mockUseClaimGuestAppointments(),
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: (...args: unknown[]) => mockUseDashboardStats(...args),
}));

vi.mock("@/hooks/useFeedback", () => ({
  useCreateFeedback: () => mockUseCreateFeedback(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "pt-BR" }),
  usePathname: () => "/pt-BR/meus-agendamentos",
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
}));

vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => ({ data: null }),
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => ({
    bookingHref: null,
    shouldShowBooking: false,
    isExternal: false,
    isInternal: true,
  }),
}));

vi.mock("@/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => ({
    loyaltyProgram: true,
    referralProgram: true,
    eventsSection: true,
  }),
}));

vi.mock("@/components/notifications/NotificationPanel", () => ({
  NotificationPanel: () => <div data-testid="notification-panel" />,
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">theme-toggle</button>,
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
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
  formatLocalizedDateFromIsoDateLike: vi.fn().mockReturnValue("10 de março"),
  getRelativeDateLabel: vi.fn().mockReturnValue(null),
}));

vi.mock("@/utils/time-slots", () => ({
  getMinutesUntilAppointment: vi.fn().mockReturnValue(180),
}));

vi.mock("@/lib/booking/cancellation", () => ({
  getAppointmentCancellationStatus: vi.fn().mockReturnValue({
    canCancel: true,
    isBlocked: false,
  }),
}));

vi.mock("@/lib/guest-session", () => ({
  hasGuestToken: (...args: unknown[]) => mockHasGuestToken(...args),
}));

vi.mock("@/components/booking/GuestAppointmentsLookup", () => ({
  GuestAppointmentsLookup: () => (
    <div data-testid="guest-appointments-lookup">GuestView</div>
  ),
}));

vi.mock("@/components/feedback", () => ({
  FeedbackModal: () => null,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("MeusAgendamentosClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCancelAppointment.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    mockUseCreateFeedback.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseClaimGuestAppointments.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDashboardStats.mockReturnValue({ data: null });
    mockHasGuestToken.mockReturnValue(false);
  });

  it("shows loading skeleton while checking user", async () => {
    mockUseUser.mockReturnValue({ data: null, isLoading: true });
    mockUseClientAppointments.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<MeusAgendamentosClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Meus Agendamentos")).toBeInTheDocument();
    });
  });

  it("shows guest view when user is not logged in", async () => {
    mockUseUser.mockReturnValue({ data: null, isLoading: false });
    mockUseClientAppointments.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<MeusAgendamentosClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByTestId("guest-appointments-lookup"),
      ).toBeInTheDocument();
    });
    expect(mockUseClientAppointments).toHaveBeenCalledWith(false);
    expect(mockUseDashboardStats).toHaveBeenCalledWith(false);
  });

  it("shows empty state when user has no appointments", async () => {
    mockUseUser.mockReturnValue({
      data: { email: "test@example.com" },
      isLoading: false,
    });
    mockUseClientAppointments.mockReturnValue({ data: [], isLoading: false });

    render(<MeusAgendamentosClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Nenhum agendamento ainda")).toBeInTheDocument();
    });
  });

  it("shows upcoming appointments section", async () => {
    mockUseUser.mockReturnValue({
      data: { email: "test@example.com" },
      isLoading: false,
    });
    mockUseClientAppointments.mockReturnValue({
      data: [
        {
          id: "apt-1",
          date: "2026-03-10",
          startTime: "09:00",
          endTime: "09:30",
          status: "CONFIRMED",
          cancelReason: null,
          service: { id: "s-1", name: "Corte", duration: 30, price: 50 },
          barber: { id: "b-1", name: "Carlos", avatarUrl: null },
          client: null,
          guestClient: null,
        },
      ],
      isLoading: false,
    });

    render(<MeusAgendamentosClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Próximos Agendamentos")).toBeInTheDocument();
      expect(screen.getByText("Corte")).toBeInTheDocument();
    });
  });

  it("renders shared header with page title when authenticated", async () => {
    mockUseUser.mockReturnValue({
      data: { id: "u1", email: "test@example.com" },
      isLoading: false,
    });
    mockUseClientAppointments.mockReturnValue({ data: [], isLoading: false });

    render(<MeusAgendamentosClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Meus Agendamentos")).toBeInTheDocument();
    });
  });

  it("shows explicit guest import card when authenticated and guest token exists", async () => {
    mockHasGuestToken.mockReturnValue(true);
    mockUseUser.mockReturnValue({
      data: { id: "u1", email: "test@example.com" },
      isLoading: false,
    });
    mockUseClientAppointments.mockReturnValue({ data: [], isLoading: false });

    render(<MeusAgendamentosClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Importar meus agendamentos guest"),
      ).toBeInTheDocument();
    });
  });
});
