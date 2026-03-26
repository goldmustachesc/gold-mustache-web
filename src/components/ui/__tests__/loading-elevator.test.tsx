import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadingElevator } from "../loading-elevator";

vi.mock("next/image", () => ({
  default: () => <div data-testid="logo" />,
}));

describe("LoadingElevator", () => {
  it("invoca onAnimationComplete quando right door termina a transição com open=true", () => {
    const onAnimationComplete = vi.fn();

    const { container } = render(
      <LoadingElevator open onAnimationComplete={onAnimationComplete} />,
    );

    const rightDoor = container.querySelectorAll("div")[3];
    fireEvent.transitionEnd(rightDoor);

    expect(onAnimationComplete).toHaveBeenCalledOnce();
  });

  it("não invoca onAnimationComplete quando open=false", () => {
    const onAnimationComplete = vi.fn();

    const { container } = render(
      <LoadingElevator
        open={false}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    const rightDoor = container.querySelectorAll("div")[3];
    fireEvent.transitionEnd(rightDoor);

    expect(onAnimationComplete).not.toHaveBeenCalled();
  });
});
