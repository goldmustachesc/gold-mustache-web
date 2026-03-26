import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressSidebar } from "../ProgressSidebar";

const STEPS = [
  { label: "Nome do cliente", completed: false },
  { label: "Telefone válido", completed: false },
  { label: "Serviço selecionado", completed: false },
  { label: "Data selecionada", completed: false },
  { label: "Horário selecionado", completed: false },
];

describe("ProgressSidebar", () => {
  it("renders all step labels", () => {
    render(<ProgressSidebar steps={STEPS} completedSteps={0} />);

    for (const step of STEPS) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
    }
  });

  it("renders progress count", () => {
    render(<ProgressSidebar steps={STEPS} completedSteps={3} />);
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("renders progress bar with correct width", () => {
    const { container } = render(
      <ProgressSidebar steps={STEPS} completedSteps={2} />,
    );
    const bar = container.querySelector("[data-testid='progress-fill']");
    expect(bar).toHaveStyle({ width: "40%" });
  });

  it("renders title and label", () => {
    render(<ProgressSidebar steps={STEPS} completedSteps={0} />);
    const matches = screen.getAllByText("Progresso");
    expect(matches).toHaveLength(2);
  });
});
