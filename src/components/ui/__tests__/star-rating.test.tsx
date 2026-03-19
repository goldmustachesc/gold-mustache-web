import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StarRating, StarRatingDisplay } from "../star-rating";

describe("StarRating", () => {
  it("permite hover, clique e teclado quando interativo", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <StarRating
        value={2}
        onChange={onChange}
        showValue
        aria-label="Minha nota"
      />,
    );

    const thirdStar = screen.getByRole("button", { name: "3 estrelas" });
    await user.hover(thirdStar);
    await user.click(thirdStar);
    fireEvent.keyDown(screen.getByRole("button", { name: "4 estrelas" }), {
      key: "Enter",
    });

    expect(onChange).toHaveBeenNthCalledWith(1, 3);
    expect(onChange).toHaveBeenNthCalledWith(2, 4);
    expect(screen.getByText("2.0")).toBeInTheDocument();
    expect(screen.getByTitle("Minha nota")).toBeInTheDocument();
  });

  it("desabilita interação quando componente está disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<StarRating value={4} onChange={onChange} disabled />);

    await user.click(screen.getByRole("button", { name: "5 estrelas" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});

describe("StarRatingDisplay", () => {
  it("renderiza valor decimal e título acessível", () => {
    render(<StarRatingDisplay value={4.5} size="lg" showValue />);

    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(
      screen.getByTitle("Avaliação: 4.5 de 5 estrelas"),
    ).toBeInTheDocument();
  });
});
