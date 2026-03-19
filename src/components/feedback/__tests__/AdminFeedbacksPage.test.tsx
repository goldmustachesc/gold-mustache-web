import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFeedbacksPage } from "../AdminFeedbacksPage";

const mocks = vi.hoisted(() => ({
  usePrivateHeader: vi.fn(),
  useAdminFeedbacks: vi.fn(),
  useAdminFeedbackStats: vi.fn(),
  useBarberRanking: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/private/PrivateHeaderContext", () => ({
  usePrivateHeader: (...args: unknown[]) => mocks.usePrivateHeader(...args),
}));

vi.mock("@/hooks/useFeedback", () => ({
  useAdminFeedbacks: (...args: unknown[]) => mocks.useAdminFeedbacks(...args),
  useAdminFeedbackStats: () => mocks.useAdminFeedbackStats(),
  useBarberRanking: () => mocks.useBarberRanking(),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => (
    <div>
      <select value={value} onChange={(e) => onValueChange(e.target.value)}>
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({
    children,
  }: {
    children: ReactNode;
    className?: string;
  }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <>{placeholder}</>
  ),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode; className?: string }) => (
    <div>{children}</div>
  ),
  AvatarImage: ({ src }: { src?: string }) => <span>{src ?? "no-avatar"}</span>,
  AvatarFallback: ({
    children,
  }: {
    children: ReactNode;
    className?: string;
  }) => <span>{children}</span>,
}));

vi.mock("../FeedbackCard", () => ({
  FeedbackCard: ({
    feedback,
    showBarber,
  }: {
    feedback: { id: string; comment: string };
    showBarber?: boolean;
  }) => <div>{`${feedback.comment}-${showBarber ? "barber" : "plain"}`}</div>,
  FeedbackEmptyState: ({
    message,
    description,
  }: {
    message: string;
    description: string;
  }) => (
    <div>
      <span>{message}</span>
      <span>{description}</span>
    </div>
  ),
}));

vi.mock("../FeedbackStats", () => ({
  FeedbackStatsGrid: ({ stats }: { stats: { totalFeedbacks: number } }) => (
    <div>{`stats-grid:${stats.totalFeedbacks}`}</div>
  ),
}));

vi.mock("@/components/ui/star-rating", () => ({
  StarRatingDisplay: ({ value }: { value: number }) => (
    <div>{`rating:${value}`}</div>
  ),
}));

describe("AdminFeedbacksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAdminFeedbackStats.mockReturnValue({
      data: { totalFeedbacks: 12 },
      isLoading: false,
    });
    mocks.useBarberRanking.mockReturnValue({
      data: [
        {
          barberId: "barber-1",
          barberName: "Carlos",
          avatarUrl: null,
          totalFeedbacks: 8,
          averageRating: 4.8,
        },
      ],
      isLoading: false,
    });
  });

  it("configura header e mostra loading quando algum hook ainda carrega", () => {
    mocks.useAdminFeedbacks.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <AdminFeedbacksPage
        locale="pt-BR"
        barbers={[{ id: "barber-1", name: "Carlos" }]}
      />,
    );

    expect(mocks.usePrivateHeader).toHaveBeenCalledWith({
      title: "Avaliações",
      icon: expect.anything(),
      backHref: "/pt-BR/dashboard",
    });
    expect(
      screen.queryByText("Nenhuma avaliação encontrada"),
    ).not.toBeInTheDocument();
  });

  it("renderiza ranking, stats, feedbacks e paginação", async () => {
    const user = userEvent.setup();

    mocks.useAdminFeedbacks.mockImplementation(
      (filters: { barberId?: string; rating?: string }, page: number) => ({
        data: {
          feedbacks: [{ id: `fb-${page}`, comment: `feedback-${page}` }],
          total: 3,
          totalPages: 2,
          filters,
        },
        isLoading: false,
      }),
    );

    render(
      <AdminFeedbacksPage
        locale="pt-BR"
        barbers={[
          { id: "barber-1", name: "Carlos" },
          { id: "barber-2", name: "Pedro" },
        ]}
      />,
    );

    expect(screen.getByText("stats-grid:12")).toBeInTheDocument();
    expect(screen.getAllByText("Carlos")).not.toHaveLength(0);
    expect(screen.getByText("rating:4.8")).toBeInTheDocument();
    expect(screen.getByText("feedback-1-barber")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(screen.getByText("feedback-2-barber")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("mostra estado vazio e reseta pagina ao trocar filtro", async () => {
    const user = userEvent.setup();

    mocks.useAdminFeedbacks.mockImplementation(
      (filters: { barberId?: string; rating?: string }, page: number) => ({
        data: {
          feedbacks: [],
          total: 0,
          totalPages: 1,
          filters,
          page,
        },
        isLoading: false,
      }),
    );

    render(
      <AdminFeedbacksPage
        locale="pt-BR"
        barbers={[{ id: "barber-1", name: "Carlos" }]}
      />,
    );

    expect(
      screen.getByText("Nenhuma avaliação encontrada"),
    ).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "barber-1");
    await user.selectOptions(selects[1], "5");

    expect(mocks.useAdminFeedbacks).toHaveBeenLastCalledWith(
      { barberId: "barber-1", rating: "5" },
      1,
      20,
    );
  });
});
