import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FeedbackWithDetails } from "@/types/feedback";
import { FeedbackCard, FeedbackEmptyState } from "../FeedbackCard";

function buildFeedback(
  overrides: Partial<FeedbackWithDetails> = {},
): FeedbackWithDetails {
  return {
    id: "fb-1",
    appointmentId: "apt-1",
    barberId: "b1",
    clientId: "c1",
    guestClientId: null,
    rating: 5,
    comment: "Ótimo",
    createdAt: new Date().toISOString(),
    appointment: {
      id: "apt-1",
      date: "2025-03-01",
      startTime: "10:00",
      service: { id: "s1", name: "Corte" },
    },
    barber: { id: "b1", name: "João", avatarUrl: null },
    client: { id: "c1", fullName: "Maria" },
    guestClient: null,
    ...overrides,
  };
}

describe("FeedbackCard", () => {
  it("prioriza nome do cliente cadastrado", () => {
    render(<FeedbackCard feedback={buildFeedback()} />);

    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText("Ótimo")).toBeInTheDocument();
  });

  it("usa convidado ou rótulo anônimo e pode exibir barbeiro em modo admin", () => {
    const guest = buildFeedback({
      client: null,
      guestClient: { id: "g1", fullName: "Pedro" },
      comment: null,
    });

    render(<FeedbackCard feedback={guest} showBarber compact />);

    expect(screen.getByText("Pedro")).toBeInTheDocument();
    expect(screen.getByText(/Barbeiro:/)).toBeInTheDocument();
  });
});

describe("FeedbackEmptyState", () => {
  it("usa mensagens padrão", () => {
    render(<FeedbackEmptyState />);

    expect(
      screen.getByText("Nenhuma avaliação encontrada"),
    ).toBeInTheDocument();
  });

  it("aceita mensagem e descrição customizadas", () => {
    render(<FeedbackEmptyState message="Vazio" description="Sem dados" />);

    expect(screen.getByText("Vazio")).toBeInTheDocument();
    expect(screen.getByText("Sem dados")).toBeInTheDocument();
  });
});
