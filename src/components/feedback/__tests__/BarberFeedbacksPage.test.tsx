import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BarberFeedbacksPage } from "../BarberFeedbacksPage";

const mocks = vi.hoisted(() => ({
  usePrivateHeader: vi.fn(),
  useBarberFeedbacks: vi.fn(),
  useBarberFeedbackStats: vi.fn(),
}));

vi.mock("@/components/private/PrivateHeaderContext", () => ({
  usePrivateHeader: (...args: unknown[]) => mocks.usePrivateHeader(...args),
}));

vi.mock("@/hooks/useFeedback", () => ({
  useBarberFeedbacks: (...args: unknown[]) => mocks.useBarberFeedbacks(...args),
  useBarberFeedbackStats: () => mocks.useBarberFeedbackStats(),
}));

vi.mock("../FeedbackCard", () => ({
  FeedbackCard: ({ feedback }: { feedback: { comment: string } }) => (
    <div>{feedback.comment}</div>
  ),
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
  FeedbackStats: ({
    stats,
    title,
  }: {
    stats: { totalFeedbacks: number };
    title: string;
  }) => <div>{`${title}:${stats.totalFeedbacks}`}</div>,
}));

describe("BarberFeedbacksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configura header e mostra loading", () => {
    mocks.useBarberFeedbacks.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mocks.useBarberFeedbackStats.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<BarberFeedbacksPage locale="pt-BR" barberName="Carlos" />);

    expect(mocks.usePrivateHeader).toHaveBeenCalledWith({
      title: "Minhas Avaliações",
      icon: expect.anything(),
      backHref: "/pt-BR/barbeiro",
    });
    expect(
      screen.queryByText("Nenhuma avaliação ainda"),
    ).not.toBeInTheDocument();
  });

  it("renderiza stats, feedbacks e paginação", async () => {
    const user = userEvent.setup();

    mocks.useBarberFeedbacks.mockImplementation((page: number) => ({
      data: {
        feedbacks: [{ id: `fb-${page}`, comment: `feedback-${page}` }],
        total: 2,
        totalPages: 2,
      },
      isLoading: false,
    }));
    mocks.useBarberFeedbackStats.mockReturnValue({
      data: { totalFeedbacks: 2 },
      isLoading: false,
    });

    render(<BarberFeedbacksPage locale="pt-BR" barberName="Carlos" />);

    expect(screen.getByText("Resumo das Avaliações:2")).toBeInTheDocument();
    expect(screen.getByText("feedback-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(screen.getByText("feedback-2")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("mostra estado vazio quando nao existem avaliações", () => {
    mocks.useBarberFeedbacks.mockReturnValue({
      data: {
        feedbacks: [],
        total: 0,
        totalPages: 1,
      },
      isLoading: false,
    });
    mocks.useBarberFeedbackStats.mockReturnValue({
      data: { totalFeedbacks: 0 },
      isLoading: false,
    });

    render(<BarberFeedbacksPage locale="pt-BR" barberName="Carlos" />);

    expect(screen.getByText("Nenhuma avaliação ainda")).toBeInTheDocument();
  });
});
