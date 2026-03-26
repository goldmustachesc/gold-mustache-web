import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackModal } from "../FeedbackModal";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({
    children,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("../FeedbackForm", () => ({
  FeedbackForm: ({
    onSubmit,
    barberName,
    serviceName,
    isLoading,
  }: {
    onSubmit: (data: { rating: number; comment?: string }) => Promise<void>;
    barberName?: string;
    serviceName?: string;
    isLoading?: boolean;
    className?: string;
  }) => (
    <div>
      <span>{`form:${barberName}:${serviceName}:${isLoading ? "loading" : "idle"}`}</span>
      <button
        type="button"
        onClick={() => void onSubmit({ rating: 5, comment: "Excelente" })}
      >
        enviar-feedback
      </button>
    </div>
  ),
}));

describe("FeedbackModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza dados do atendimento e delega submit ao form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    let closeCallback: (() => void) | undefined;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        closeCallback = callback;
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    render(
      <FeedbackModal
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        barberName="Carlos"
        serviceName="Corte"
        appointmentDate="10/03/2026"
      />,
    );

    expect(screen.getByText("Avaliar Atendimento")).toBeInTheDocument();
    expect(screen.getByText("Atendimento em 10/03/2026")).toBeInTheDocument();
    expect(screen.getByText("form:Carlos:Corte:idle")).toBeInTheDocument();

    fireEvent.click(screen.getByText("enviar-feedback"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith({ rating: 5, comment: "Excelente" });
    expect(screen.getByText("Obrigado pela avaliação!")).toBeInTheDocument();

    act(() => {
      closeCallback?.();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reseta o estado de envio quando o modal fecha manualmente", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <FeedbackModal
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        barberName="Carlos"
      />,
    );

    await act(async () => {
      await onSubmit({ rating: 5, comment: "Excelente" });
    });

    rerender(
      <FeedbackModal
        open={false}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        barberName="Carlos"
      />,
    );

    rerender(
      <FeedbackModal
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        barberName="Carlos"
      />,
    );

    expect(screen.getByText("Avaliar Atendimento")).toBeInTheDocument();
  });

  it("propaga estado de loading para o form", () => {
    render(
      <FeedbackModal
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading
      />,
    );

    expect(
      screen.getByText("form:undefined:undefined:loading"),
    ).toBeInTheDocument();
  });
});
