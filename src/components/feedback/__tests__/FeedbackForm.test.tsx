import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackForm } from "../FeedbackForm";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeedbackForm", () => {
  it("disables submit button when rating is 0", () => {
    render(<FeedbackForm onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /enviar avaliação/i }),
    ).toBeDisabled();
  });

  it("calls onSubmit with rating and optional comment", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<FeedbackForm onSubmit={onSubmit} initialRating={4} />);

    await user.type(screen.getByLabelText(/comentário/i), "Great service!");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        rating: 4,
        comment: "Great service!",
      });
    });
  });

  it("submits without comment when empty", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<FeedbackForm onSubmit={onSubmit} initialRating={5} />);

    await user.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        rating: 5,
        comment: undefined,
      });
    });
  });

  it("disables submit button when loading", () => {
    render(<FeedbackForm onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled();
  });

  it("shows error message on submit failure", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(<FeedbackForm onSubmit={onSubmit} initialRating={3} />);

    await user.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Erro ao enviar avaliação. Tente novamente."),
      ).toBeInTheDocument();
    });
  });

  it("displays barber and service context when provided", () => {
    render(
      <FeedbackForm
        onSubmit={vi.fn()}
        barberName="Carlos"
        serviceName="Corte"
      />,
    );
    expect(screen.getByText(/carlos/i)).toBeInTheDocument();
    expect(screen.getByText(/corte/i)).toBeInTheDocument();
  });
});
