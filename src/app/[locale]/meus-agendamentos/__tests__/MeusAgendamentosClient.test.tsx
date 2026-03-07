import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MeusAgendamentosClient } from "../MeusAgendamentosClient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockUseUser = vi.fn();
const mockUseSignOut = vi.fn();
const mockUseClientAppointments = vi.fn();
const mockUseDashboardStats = vi.fn();
const mockUseCancelAppointment = vi.fn();
const mockUseCreateFeedback = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mockUseUser(),
  useSignOut: () => mockUseSignOut(),
}));

vi.mock("@/hooks/useBooking", () => ({
  useClientAppointments: () => mockUseClientAppointments(),
  useCancelAppointment: () => mockUseCancelAppointment(),
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: () => mockUseDashboardStats(),
}));

vi.mock("@/hooks/useFeedback", () => ({
  useCreateFeedback: () => mockUseCreateFeedback(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    <img {...props} src={props.src as string} alt={props.alt as string} />
  ),
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
  hasGuestToken: vi.fn().mockReturnValue(false),
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
    mockUseSignOut.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseCancelAppointment.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    mockUseCreateFeedback.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDashboardStats.mockReturnValue({ data: null });
  });

  it("shows loading state while checking user", async () => {
    mockUseUser.mockReturnValue({ data: null, isLoading: true });
    mockUseClientAppointments.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<MeusAgendamentosClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("auth-skeleton")).toBeInTheDocument();
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

  it("shows user email in header when authenticated", async () => {
    mockUseUser.mockReturnValue({
      data: { email: "test@example.com" },
      isLoading: false,
    });
    mockUseClientAppointments.mockReturnValue({ data: [], isLoading: false });

    render(<MeusAgendamentosClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });
});
