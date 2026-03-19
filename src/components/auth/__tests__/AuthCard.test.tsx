import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthCard } from "../AuthCard";

describe("AuthCard", () => {
  it("renderiza título, descrição opcional e filhos", () => {
    render(
      <AuthCard title="Entrar" description="Acesse sua conta">
        <button type="submit">OK</button>
      </AuthCard>,
    );

    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByText("Acesse sua conta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("não renderiza parágrafo quando description é omitida", () => {
    render(
      <AuthCard title="Reset">
        <div>Campos</div>
      </AuthCard>,
    );

    expect(screen.getByText("Campos")).toBeInTheDocument();
    expect(document.querySelector("p")).toBeNull();
  });
});
