import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LoadingElevator } from "../loading-elevator";

vi.mock("framer-motion", () => {
  const motion = {
    div: ({
      children,
      onAnimationComplete,
      ...rest
    }: {
      children?: ReactNode;
      onAnimationComplete?: () => void;
    }) => {
      onAnimationComplete?.();
      return <div {...rest}>{children}</div>;
    },
  };
  return { motion };
});

vi.mock("next/image", () => ({
  default: () => <div data-testid="logo" />,
}));

describe("LoadingElevator", () => {
  it("invoca onAnimationComplete quando open é true", () => {
    const onAnimationComplete = vi.fn();

    render(<LoadingElevator open onAnimationComplete={onAnimationComplete} />);

    expect(onAnimationComplete).toHaveBeenCalled();
  });
});
