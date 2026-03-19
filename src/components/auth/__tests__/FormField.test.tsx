import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "../FormField";

describe("FormField", () => {
  it("mostra label e aplica borda de erro quando error existe", () => {
    const { container } = render(
      <FormField
        id="email"
        label="E-mail"
        error={{ type: "required", message: "Obrigatório" }}
      />,
    );

    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByText("Obrigatório")).toBeInTheDocument();
    const input = container.querySelector("#email");
    expect(input).toHaveClass("border-destructive");
  });

  it("não renderiza mensagem quando não há erro", () => {
    render(<FormField id="name" label="Nome" />);

    expect(screen.queryByText("Obrigatório")).not.toBeInTheDocument();
  });
});
