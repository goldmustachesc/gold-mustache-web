import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmitButton } from "../SubmitButton";

describe("SubmitButton", () => {
  it("renders confirm text when not loading", () => {
    render(<SubmitButton disabled={false} loading={false} onClick={vi.fn()} />);
    expect(screen.getByText("Confirmar Agendamento")).toBeInTheDocument();
  });

  it("renders loading text when pending", () => {
    render(<SubmitButton disabled={true} loading={true} onClick={vi.fn()} />);
    expect(screen.getByText(/Criando/)).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<SubmitButton disabled={true} loading={false} onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<SubmitButton disabled={false} loading={false} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports submit type", () => {
    render(
      <SubmitButton
        disabled={false}
        loading={false}
        onClick={vi.fn()}
        type="submit"
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
