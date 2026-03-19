import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminBarberFeedbacksPage } from "../AdminBarberFeedbacksPage";

const mocks = vi.hoisted(() => ({
  useAdminBarberFeedbacks: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/hooks/useFeedback", () => ({
  useAdminBarberFeedbacks: (...args: unknown[]) =>
    mocks.useAdminBarberFeedbacks(...args),
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

describe("AdminBarberFeedbacksPage", () => {
  const barber = {
    id: "barber-1",
    name: "Carlos",
    avatarUrl: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra loading quando feedbacks ainda estao carregando", () => {
    mocks.useAdminBarberFeedbacks.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<AdminBarberFeedbacksPage locale="pt-BR" barber={barber} />);

    expect(screen.getByText("Avaliações de Carlos")).toBeInTheDocument();
  });

  it("renderiza stats, feedbacks e paginação", async () => {
    const user = userEvent.setup();

    mocks.useAdminBarberFeedbacks.mockImplementation(
      (_id: string, page: number) => ({
        data: {
          feedbacks: [{ id: `fb-${page}`, comment: `feedback-${page}` }],
          total: 2,
          totalPages: 2,
          stats: { totalFeedbacks: 2 },
        },
        isLoading: false,
      }),
    );

    render(<AdminBarberFeedbacksPage locale="pt-BR" barber={barber} />);

    expect(screen.getByText("Resumo das Avaliações:2")).toBeInTheDocument();
    expect(screen.getByText("feedback-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(screen.getByText("feedback-2")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("mostra estado vazio quando barbeiro nao tem avaliações", () => {
    mocks.useAdminBarberFeedbacks.mockReturnValue({
      data: {
        feedbacks: [],
        total: 0,
        totalPages: 1,
        stats: { totalFeedbacks: 0 },
      },
      isLoading: false,
    });

    render(<AdminBarberFeedbacksPage locale="pt-BR" barber={barber} />);

    expect(screen.getByText("Nenhuma avaliação ainda")).toBeInTheDocument();
  });
});
